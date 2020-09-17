const ElfFile = require("./lib/elf");

module.exports = {
    read: (fileStream) => { return new ElfFile(fileStream); }
}