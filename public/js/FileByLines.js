class FileByLines  {
    constructor(filetext) {
        this.fileText = filetext;
        this.lines = filetext.split(/\r\n|\r|\n/g); // accounts for the three NEWLINE types

        // split: final line separator before EOF will result in a blank line
        if (! this.lines[this.lines.length-1]) {
            this.lines.splice(this.lines.length-1, 1); // delete final array element if blank
        }
        console.dir(this.lines);
    }

    *nextLine() {
        for (var i in this.lines) {
            var line = this.lines[i];
            yield line;
        }
    }
}

