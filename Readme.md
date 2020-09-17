# Node Elf
Node Elf is a project demonstrating how to parse an [Executable and Linkable Format File](https://en.wikipedia.org/wiki/Executable_and_Linkable_Format). Powered by [Arcsecond](https://github.com/francisrstokes/arcsecond/) and [Arcsecond-Binary](https://github.com/francisrstokes/arcsecond-binary)

--- 

## Overview
- File Header
- Section Headers
- Program Header
- Section Header String Table

## Demo
### File Header
```JavaScript
const file = fs.readFileSync(path.join(__dirname, "examples/arm64.so"));
const elfFile = elf.read(file.buffer);
console.log(elfFile.fileHeader);
```
```Javascript
{
  EI_MAGIC: 2135247942,
  EI_CLASS: 2, // 32bit == 0x01, 64bit == 0x02
  EI_DATA: 1, // Little Endian == 0x01, Big Endian == 0x02
  EI_VERSION: 1,
  EI_OSABI: 0,
  EI_ABIVERSION: 0,
  e_type: 3,
  e_machine: 183,
  e_version: 1,
  e_entry: 81568n,
  e_phoff: 64n,
  e_shoff: 1086392n,
  e_flags: 0,
  e_ehsize: 64,
  e_phentsize: 56,
  e_phnum: 8,
  e_shentsize: 64,
  e_shnum: 25,
  e_shstrndx: 24 // Section Header's string table index
}
```

### Section Headers
Names are automatically populated from section header string table (refer to e_shstrndx in the file header)
```JavaScript
const file = fs.readFileSync(path.join(__dirname, "examples/arm64.so"));
const elfFile = elf.read(file.buffer);
console.log(elfFile.sectionHeaders);
```
```Javascript
[ 
  {
    sh_name: 11,
    sh_type: 7,
    sh_flags: 2n,
    sh_addr: 512n,
    sh_offset: 512n,
    sh_size: 36n,
    sh_link: 0,
    sh_info: 0,
    sh_addralign: 4n,
    sh_entsize: 0n,
    name: '.note.gnu.build-id'
  },
  {
    sh_name: 30,
    sh_type: 5,
    sh_flags: 2n,
    sh_addr: 552n,
    sh_offset: 552n,
    sh_size: 2464n,
    sh_link: 3,
    sh_info: 0,
    sh_addralign: 8n,
    sh_entsize: 4n,
    name: '.hash'
  },
  {
    sh_name: 36,
    sh_type: 11,
    sh_flags: 2n,
    sh_addr: 3016n,
    sh_offset: 3016n,
    sh_size: 8424n,
    sh_link: 4,
    sh_info: 3,
    sh_addralign: 8n,
    sh_entsize: 24n,
    name: '.dynsym'
  },
  {
    sh_name: 44,
    sh_type: 3,
    sh_flags: 2n,
    sh_addr: 11440n,
    sh_offset: 11440n,
    sh_size: 6708n,
    sh_link: 0,
    sh_info: 0,
    sh_addralign: 1n,
    sh_entsize: 0n,
    name: '.dynstr'
  },
  ...
]
```

### Program Headers
```JavaScript
const file = fs.readFileSync(path.join(__dirname, "examples/arm64.so"));
const elfFile = elf.read(file.buffer);
console.log(elfFile.fileHeader);
```
```Javascript
[
  {
    p_type: 1,
    p_flags: 5,
    p_offset: 0n,
    p_vaddr: 0n,
    p_paddr: 0n,
    p_filesz: 1058524n,
    p_memsz: 1058524n,
    p_align: 65536n
  },
  {
    p_type: 1,
    p_flags: 6,
    p_offset: 1060288n,
    p_vaddr: 1125824n,
    p_paddr: 1125824n,
    p_filesz: 25752n,
    p_memsz: 5354408n,
    p_align: 65536n
  },
  {
    p_type: 2,
    p_flags: 6,
    p_offset: 1081224n,
    p_vaddr: 1146760n,
    p_paddr: 1146760n,
    p_filesz: 592n,
    p_memsz: 592n,
    p_align: 8n
  },
  {
    p_type: 4,
    p_flags: 4,
    p_offset: 512n,
    p_vaddr: 512n,
    p_paddr: 512n,
    p_filesz: 36n,
    p_memsz: 36n,
    p_align: 4n
  },
  {
    p_type: 4,
    p_flags: 4,
    p_offset: 1058372n,
    p_vaddr: 1058372n,
    p_paddr: 1058372n,
    p_filesz: 152n,
    p_memsz: 152n,
    p_align: 4n
  },
  ...
]
```

## Tests
```Javascript
npm test
```
```Javascript

> node_elf@1.0.0 test
> mocha



  ELF reader
    √ parses valid Arm 64 ELF files
    √ parses valid Arm 32 ELF files


  2 passing (10ms)
```