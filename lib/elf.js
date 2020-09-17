const A = require("arcsecond");
const B = require("arcsecond-binary");
const ArcExt = require("./arc_binary_extension");
const StringDecoder = new TextDecoder("utf-8");

const readZeroTerminatedStringAt = function (b, startIndex) {
  const buffer = Buffer.from(b);
  var bytes = [];
  var currentIndex = startIndex;
  var currentByte;

  while ((currentByte = buffer.readUInt8(currentIndex)) != 0x00) {
    bytes.push(currentByte);
    currentIndex += 1;
  }

  return {
    content: StringDecoder.decode(Buffer.from(bytes)),
    endIndex: currentIndex,
  };
};

const fileHeaderChunk = A.coroutine(function* () {
  /* Magic */
  const EI_MAGIC = yield B.exactU32BE(0x7f454c46);

  const EI_CLASS = yield B.u8;
  const EI_DATA = yield B.u8;
  const EI_VERSION = yield B.u8;
  const EI_OSABI = yield B.u8;
  const EI_ABIVERSION = yield B.u8;

  /* Discard 7 padding bytes of 0x00 */
  for (var i = 0; i < 7; i++) yield B.exactU8(0x00);

  /* Set our data type parsers based on provided EI_DATA (0x01 -> Little Endian, 0x02 -> Big Endian) */
  const u16 = EI_DATA == 0x01 ? B.u16LE : B.u16BE;
  const u32 = EI_DATA == 0x01 ? B.u32LE : B.u32BE;
  const u64 = EI_DATA == 0x01 ? ArcExt.u64LE : ArcExt.u64BE;

  const e_type = yield u16;
  const e_machine = yield u16;
  const e_version = yield u32;

  /* Switch between 4 byte or 8 byte read based on EI_CLASS (0x01 -> 32bit, 0x02 -> 64bit) */
  const e_entry = EI_CLASS == 0x01 ? yield u32 : yield u64;
  const e_phoff = EI_CLASS == 0x01 ? yield u32 : yield u64;
  const e_shoff = EI_CLASS == 0x01 ? yield u32 : yield u64;

  const e_flags = yield u32;
  const e_ehsize = yield u16;
  const e_phentsize = yield u16;
  const e_phnum = yield u16;
  const e_shentsize = yield u16;
  const e_shnum = yield u16;
  const e_shstrndx = yield u16;

  const headerChunkData = {
    EI_MAGIC,
    EI_CLASS,
    EI_DATA,
    EI_VERSION,
    EI_OSABI,
    EI_ABIVERSION,

    e_type,
    e_machine,
    e_version,

    e_entry,
    e_phoff,
    e_shoff,

    e_flags,
    e_ehsize,
    e_phentsize,
    e_phnum,
    e_shentsize,
    e_shnum,
    e_shstrndx,
  };

  yield A.setData(headerChunkData);
  return headerChunkData;
});

const programHeaderChunk = A.withData(
  A.coroutine(function* () {
    const { wide, littleEndian } = yield A.getData;

    /* Set our data type parsers based on provided EI_DATA (0x01 -> Little Endian, 0x02 -> Big Endian) */
    const u32 = littleEndian ? B.u32LE : B.u32BE;
    const u64 = littleEndian ? ArcExt.u64LE : ArcExt.u64BE;

    const p_type = yield u32;

    var p_flags;
    if (wide) p_flags = yield u32;

    const p_offset = yield (wide == true ? u64 : u32);
    const p_vaddr = yield (wide == true ? u64 : u32);
    const p_paddr = yield (wide == true ? u64 : u32);
    const p_filesz = yield (wide == true ? u64 : u32);
    const p_memsz = yield (wide == true ? u64 : u32);

    if (!wide) p_flags = yield u32;

    const p_align = yield (wide == true ? u64 : u32);

    const programHeaderChunkData = {
      p_type,
      p_flags,
      p_offset,
      p_vaddr,
      p_paddr,
      p_filesz,
      p_memsz,
      p_align,
    };

    yield A.setData(programHeaderChunkData);
    return programHeaderChunkData;
  })
);

const sectionHeaderChunk = A.withData(
  A.coroutine(function* () {
    const { wide, littleEndian } = yield A.getData;

    /* Set our data type parsers based on provided EI_DATA (0x01 -> Little Endian, 0x02 -> Big Endian) */
    const u32 = littleEndian ? B.u32LE : B.u32BE;
    const u64 = littleEndian ? ArcExt.u64LE : ArcExt.u64BE;

    const sh_name = yield u32;
    const sh_type = yield u32;

    const sh_flags = yield (wide == true ? u64 : u32);
    const sh_addr = yield (wide == true ? u64 : u32);
    const sh_offset = yield (wide == true ? u64 : u32);
    const sh_size = yield (wide == true ? u64 : u32);

    const sh_link = yield u32;
    const sh_info = yield u32;

    const sh_addralign = yield (wide == true ? u64 : u32);
    const sh_entsize = yield (wide == true ? u64 : u32);

    const sectionHeaderChunk = {
      sh_name,
      sh_type,
      sh_flags,
      sh_addr,
      sh_offset,
      sh_size,
      sh_link,
      sh_info,
      sh_addralign,
      sh_entsize,
    };

    yield A.setData(sectionHeaderChunk);
    return sectionHeaderChunk;
  })
);

const ElfFile = class {
  constructor(buffer) {
    this.fileHeader = this._parseFileHeader(buffer);

    this.wide = this.fileHeader.EI_CLASS == 0x02;
    this.littleEndian = this.fileHeader.EI_DATA == 0x01;

    this.programHeaders = this._parseProgramHeaders(buffer);
    this.sectionHeaders = this._parseSectionHeaders(buffer);
    this._populateSectionHeaderNames(buffer);
  }

  _populateSectionHeaderNames(buffer) {
    var sHeader = this.sectionHeaders[this.fileHeader.e_shstrndx];
    var start = sHeader.sh_offset;
    var end = start + sHeader.sh_size;
    var strTableBuffer = buffer.slice(Number(start), Number(end));

    for (var sectionHeader of this.sectionHeaders) {
      sectionHeader.name = readZeroTerminatedStringAt(
        strTableBuffer,
        sectionHeader.sh_name
      ).content;
    }
  }

  _parseFileHeader(buffer) {
    const fileHeaderParser = A.sequenceOf([
      fileHeaderChunk,
    ]).map(([fileHeaderChunk]) => ({ fileHeaderChunk }));
    const fileHeader = fileHeaderParser.run(buffer);

    if (fileHeader.isError) {
      throw new Error(fileHeader.error);
    }

    return fileHeader.result.fileHeaderChunk;
  }

  _parseProgramHeaders(buffer) {
    var start = this.fileHeader.e_phoff;
    var end =
      BigInt(start) +
      BigInt(this.fileHeader.e_phnum * this.fileHeader.e_phentsize);

    var peBuff = buffer.slice(Number(start), Number(end));
    var peParses = new Array(this.fileHeader.e_phnum).fill(
      programHeaderChunk({
        wide: this.wide,
        littleEndian: this.littleEndian,
      })
    );

    const peParser = A.sequenceOf(peParses);
    const programHeaders = peParser.run(peBuff);

    if (programHeaders.isError) {
      throw new Error(programHeaders.error);
    }

    return programHeaders.result;
  }

  _parseSectionHeaders(buffer) {
    var start = this.fileHeader.e_shoff;
    var end =
      BigInt(start) +
      BigInt(this.fileHeader.e_shnum * this.fileHeader.e_shentsize);

    var shBuffer = buffer.slice(Number(start), Number(end));
    var shParses = new Array(this.fileHeader.e_shnum).fill(
      sectionHeaderChunk({
        wide: this.wide,
        littleEndian: this.littleEndian,
      })
    );

    const shParser = A.sequenceOf(shParses);
    const sectionHeaders = shParser.run(shBuffer);

    if (sectionHeaders.isError) {
      throw new Error(sectionHeaders.error);
    }

    return sectionHeaders.result;
  }
};

module.exports = ElfFile;
