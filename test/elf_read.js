const assert = require('assert');
const fs = require('fs');
const path = require('path');
const elf = require('../index.js');

describe("ELF reader", function () {

    it("parses valid Arm 64 ELF files", function () {
        const file = fs.readFileSync(path.join(__dirname, "examples/arm64.so"));

        assert.doesNotThrow(() => {
            const parsed = elf.read(file.buffer);
            assert.ok(parsed);
        });
    });

    
    it("parses valid Arm 32 ELF files", function () {
        const file = fs.readFileSync(path.join(__dirname, "examples/arm32.so"));

        assert.doesNotThrow(() => {
            const parsed = elf.read(file.buffer);
            assert.ok(parsed);
        });
    });

});