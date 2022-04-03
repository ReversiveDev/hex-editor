const sdl = require("@kmamal/sdl");
const Canvas = require("canvas");

let sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = function () {

    const window = sdl.video.createWindow({
        resizable: true,
        width: 726,
        height: 440,
    });
    const { width, height } = window;
    const cvs = Canvas.createCanvas(width, height);
    const ctx = cvs.getContext('2d');

    let palette = {
        cell_selected: "rgb(106, 183, 255)",
        cell_background: "rgb(255, 255, 255)",
        cell_hover: "rgb(204, 204, 204)",
    }

    let table_width = 16;
    let max_table_height = 20;
    let margin = 0;
    let offset = 0;
    let cell_width = 32;
    let cell_height = 22;

    let char_width = 12;
    let char_height = 15;

    let binary = new Array(table_width * max_table_height).fill(0);
    let backgrounds = new Array(table_width * max_table_height).fill("rgb(255, 255, 255)");
    // let file_chooser = document.querySelector("#file-chooser");

    let cursor = {
        x: 0,
        y: 0
    };
    let selections = [];
    let blink = false;
    let selected_blink_cooldown = 500;
    let ctrl = false;

    let scroll_bar_height = 20;
    let scroll_bar_pos = 0;
    let scrolling = false;

    function drawHexTable() {
        for (let i = 0; i < table_width * max_table_height; i++) {
            let x = i % table_width;
            let y = Math.floor(i / table_width);
            // let value = binary[offset + i] == void 0 ? "NUL" : binary[offset + i].toString(16).toUpperCase();
            // if (value !== "NUL") {
            //     value = value.length == 1 ? "0" + value : value;
            // }
            // ctx.fillStyle = cursor.x == x && cursor.y == y ? palette.cell_hover : backgrounds[offset + i];
            // let isSelected = selections.length && selections.find(selection => selection.x == x && selection.y == y);
            // if (isSelected) {
            //     ctx.fillStyle = palette.cell_selected;
            // }
            // ctx.fillRect(
            //     x * cell_width + x * margin,
            //     y * cell_height + y * margin,
            //     cell_width, cell_height);

            // if (isSelected && blink) {
            //     ctx.fillStyle = "rgb(75, 75, 75)";
            //     ctx.fillRect(
            //         x * cell_width + x * margin,
            //         y * cell_height + y * margin + cell_height - 2,
            //         cell_width, 2);
            // }

            // ctx.fillStyle = i % 2 ? "rgb(114, 114, 114)" : "rgb(75, 75, 75)";
            // ctx.textAlign = "center";
            // ctx.font = "16px monospace";
            // ctx.fillText(
            //     value,
            //     x * cell_width + x * margin + 16,
            //     y * cell_height + y * margin + cell_height / 2 + 6);
        }
    }

    function drawStringView() {
        for (let i = 0; i < table_width * max_table_height; i++) {
            let x = i % table_width;
            let y = Math.floor(i / table_width);
            // let value = ".";
            let value = Number(binary[offset + i]) >= 32 && Number(binary[offset + i]) <= 125 ? String.fromCharCode(binary[offset + i]) : ".";
            ctx.fillStyle = cursor.x == x && cursor.y == y ? palette.cell_hover : palette.cell_background;
            let isSelected = selections.length && selections.find(selection => selection.x == x && selection.y == y);
            if (isSelected) {
                ctx.fillStyle = palette.cell_selected;
            }
            ctx.fillRect(
                table_width * cell_width + 2 + x * char_width,
                y * cell_height,
                char_width, cell_height);
            ctx.fillStyle = "rgb(75, 75, 75)";
            ctx.fillText(value, table_width * cell_width + 2 + char_width / 2 + x * char_width, cell_height / 2 + 8 + y * cell_height);
        }
    }

    let lastFpsUpdate = Date.now();
    let frameCount = 0;
    async function update() {
        ctx.clearRect(0, 0, width, height);

        drawHexTable();
        // drawStringView();

        if(lastFpsUpdate + 1000 < Date.now()){
            window.setTitle(`Hex Viewer - ${frameCount} FPS`);
            frameCount = 0;
            lastFpsUpdate = Date.now();
        }

        ctx.fillStyle = "grey";
        ctx.fillRect(cvs.width - 20, 0, 20, cvs.height);
        ctx.fillStyle = "lightgrey";
        ctx.fillRect(cvs.width - 20, scroll_bar_pos, 20, scroll_bar_height);

        const buffer = cvs.toBuffer('raw')
        window.render(width, height, width * 4, 'bgra32', buffer)
        await sleep(0);
        frameCount++;
        update();
    }

    let lastY = 0;
    window.on('mouseMove', e => {
        if (scrolling) {
            scroll_bar_pos += e.y - lastY;
            if (scroll_bar_pos < 0) {
                scroll_bar_pos = 0;
            }
            if (scroll_bar_pos > cvs.height - scroll_bar_height) {
                scroll_bar_pos = cvs.height - scroll_bar_height;
            }
            offset = Math.floor(Math.ceil(scroll_bar_pos * (binary.length / table_width / (cvs.height - scroll_bar_height))) * table_width);
        }
        let x = Math.floor(e.x / cell_width);
        let y = Math.floor(e.y / cell_height);
        lastY = e.y;
        cursor.x = x;
        cursor.y = y;
    });

    let fill_offset = 0;
    function fillSize(size, color) {
        for (let i = fill_offset; i < fill_offset + size; i++) {
            backgrounds[i] = color;
        }
        fill_offset += size;
    }

    function usePNGBackground() {
        fillSize(8, "rgb(255, 0, 0)"); // PNG SIGNATURE
        while (true) {
            let length = binary[fill_offset] << 24 | binary[fill_offset + 1] << 16 | binary[fill_offset + 2] << 8 | binary[fill_offset + 3];
            fillSize(4, "rgb(55, 161, 175)"); // CHUNK LENGTH
            let type = String.fromCharCode(binary[fill_offset]) + String.fromCharCode(binary[fill_offset + 1]) + String.fromCharCode(binary[fill_offset + 2]) + String.fromCharCode(binary[fill_offset + 3]);
            fillSize(4, "rgb(222, 247, 81)"); // CHUNK TYPE (IHDR)
            if (type == "IEND") {
                fillSize(4, "rgb(255, 123, 0)"); // CHUNK CRC
                break;
            }
            if (type == "IHDR") {
                fillSize(4, "rgb(18, 206, 74)"); // width
                fillSize(4, "rgb(27, 185, 74)"); // height
                fillSize(1, "rgb(18, 206, 74)"); // bit depth
                fillSize(1, "rgb(27, 185, 74)"); // color type
                fillSize(1, "rgb(18, 206, 74)"); // compression method
                fillSize(1, "rgb(27, 185, 74)"); // filter method
                fillSize(1, "rgb(18, 206, 74)"); // interlace method
            } else if (type == "cHRM") {
                fillSize(4, "rgb(18, 206, 74)"); // white point x
                fillSize(4, "rgb(27, 185, 74)"); // white point y
                fillSize(4, "rgb(18, 206, 74)"); // red x
                fillSize(4, "rgb(27, 185, 74)"); // red y
                fillSize(4, "rgb(18, 206, 74)"); // green x
                fillSize(4, "rgb(27, 185, 74)"); // green y
                fillSize(4, "rgb(18, 206, 74)"); // blue x
                fillSize(4, "rgb(27, 185, 74)"); // blue y
            } else {
                fillSize(length, "rgb(18, 206, 74)"); // CHUNK DATA
            }
            fillSize(4, "rgb(255, 123, 0)"); // CHUNK CRC
        }
    }

    setInterval(() => {
        blink = !blink;
    }, selected_blink_cooldown);

    update();

}