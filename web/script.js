let cvs = document.getElementById("hex-view");
cvs.oncontextmenu = e => false;
document.body.appendChild(cvs);

let ctx = cvs.getContext("2d");

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
let bytes_infomation = new Array(table_width * max_table_height).fill({
    color: "rgb(255, 255, 255)",
    type: "byte"
});
let file_chooser = document.querySelector("#file-chooser");

let cursor = {
    x: 0,
    y: 0
};
let selections = [];
let blink = false;
let selected_blink_cooldown = 500;
let ctrl = false;

let mouse_sleeping_time = 0;

let scroll_bar_height = 20;
let scroll_bar_pos = 0;
let scrolling = false;

function drawHexTable() {
    for (let i = 0; i < table_width * max_table_height; i++) {
        let x = i % table_width;
        let y = Math.floor(i / table_width);
        let value = binary[offset + i] == void 0 ? "NUL" : binary[offset + i].toString(16).toUpperCase();
        if (value !== "NUL") {
            value = value.length == 1 ? "0" + value : value;
        }
        ctx.fillStyle = cursor.x == x && cursor.y == y ? palette.cell_hover : (bytes_infomation[offset + i] ? bytes_infomation[offset + i].color : null);
        let isSelected = selections.length && selections.find(selection => selection.x == x && selection.y == y);
        if (isSelected) {
            ctx.fillStyle = palette.cell_selected;
        }
        ctx.fillRect(
            x * cell_width + x * margin,
            y * cell_height + y * margin,
            cell_width, cell_height);

        if (isSelected && blink) {
            ctx.fillStyle = "rgb(75, 75, 75)";
            ctx.fillRect(
                x * cell_width + x * margin,
                y * cell_height + y * margin + cell_height - 2,
                cell_width, 2);
        }

        ctx.fillStyle = i % 2 ? "rgb(114, 114, 114)" : "rgb(75, 75, 75)";
        ctx.textAlign = "center";
        ctx.font = "16px monospace";
        ctx.fillText(
            value,
            x * cell_width + x * margin + 16,
            y * cell_height + y * margin + cell_height / 2 + 6);
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

document.addEventListener("keydown", e => {
    if (e.key == "Control")
        ctrl = true;
    else if (e.key == "ArrowDown") {
        offset += 64;
    } else if (e.key == "ArrowUp") {
        offset -= 64;
        if (offset < 0) {
            offset = 0;
        }
    }
    if (selections.length) {
        for (let selected of selections) {
            let index = selected.x + selected.y * table_width;
            if ((e.keyCode >= 48 && e.keyCode <= 57) || (e.keyCode >= 65 && e.keyCode <= 70)) {
                let byte_selected = binary[offset + index];
                if (byte_selected >= 16) {
                    binary[offset + index] = parseInt(e.key, 16);
                } else {
                    binary[offset + index] = parseInt(binary[offset + index].toString(16) + e.key, 16);
                }
            } else if (e.key == "Backspace") {
                binary[offset + index] = 0;
            }
        }
    }
});

document.addEventListener("keyup", e => {
    if (e.key == "Control")
        ctrl = false;
});

cvs.addEventListener("wheel", e => {
    selections = [];
    if (e.deltaY > 0) {
        offset += table_width;
    } else {
        offset -= table_width;
    }
    if (offset < 0) {
        offset = 0;
    }
});

let lastUpdate = Date.now();
; (function update() {
    mouse_sleeping_time += Date.now() - lastUpdate;

    ctx.clearRect(0, 0, innerWidth, innerHeight);

    drawHexTable();
    drawStringView();

    ctx.fillStyle = "grey";
    ctx.fillRect(cvs.width - 20, 0, 20, cvs.height);
    ctx.fillStyle = "lightgrey";
    ctx.fillRect(cvs.width - 20, scroll_bar_pos, 20, scroll_bar_height);

    if (mouse_sleeping_time >= 250) {
        let index = offset + cursor.x + cursor.y * table_width;
        let byte_info = bytes_infomation[index] ? bytes_infomation[index] : {
            color: "rgb(255, 255, 255)",
            type: "NUL"
        };
        let type = byte_info.type;
        let text_width = ctx.measureText(type).width;
        ctx.fillStyle = "rgb(40, 40, 40)";
        ctx.fillRect(cursor.x * cell_width + cell_width / 2 + 5, cursor.y * cell_height + cell_height / 2 + 5, text_width + 10, 25);
        ctx.fillStyle = byte_info.color;
        ctx.textAlign = "center";
        ctx.fillText(type, cursor.x * cell_width + cell_width / 2 + (text_width + 10) / 2 + 5, cursor.y * cell_height + cell_height / 2 + 23);
    }

    lastUpdate = Date.now();
    requestAnimationFrame(update);

})();

let lastY = 0;
cvs.addEventListener("mousemove", e => {
    mouse_sleeping_time = 0;
    if (scrolling) {
        if (selections.length) {
            selections = [];
        }
        scroll_bar_pos += e.offsetY - lastY;
        if (scroll_bar_pos < 0) {
            scroll_bar_pos = 0;
        }
        if (scroll_bar_pos > cvs.height - scroll_bar_height) {
            scroll_bar_pos = cvs.height - scroll_bar_height;
        }
        offset = Math.floor(Math.ceil(scroll_bar_pos * (binary.length / table_width / (cvs.height - scroll_bar_height))) * table_width);
    }
    let x = Math.floor(e.offsetX / cell_width);
    let y = Math.floor(e.offsetY / cell_height);
    lastY = e.offsetY;
    cursor.x = x;
    cursor.y = y;
});

cvs.addEventListener("mousedown", e => {
    if (e.button == 0) {
        if (!selections.find(selection => selection.x == cursor.x && selection.y == cursor.y))
            if (cursor.x < table_width && cursor.y < max_table_height) {
                if (ctrl) {
                    selections.push({ ...cursor });
                } else {
                    selections = [{ ...cursor }];
                }
            }
        if (e.offsetX > cvs.width - 20 && e.offsetY > scroll_bar_pos && e.offsetY < scroll_bar_pos + scroll_bar_height) {
            scrolling = true;
        }
    }
});

document.addEventListener("mouseup", e => {
    if (e.button == 0) {
        scrolling = false;
    }
});

let fill_palette = {
    chunk_type: "rgb(222, 247, 81)",
    chunk_length: "rgb(55, 161, 175)",
    chunk_data_0: "rgb(18, 206, 74)",
    chunk_data_1: "rgb(27, 185, 74)",
    chunk_end: "rgb(255, 123, 0)",
    signature: "rgb(255, 0, 0)",
}

let fill_offset = 0;
function fillSize(size, color, type = "byte") {
    for (let i = fill_offset; i < fill_offset + size; i++) {
        bytes_infomation[i].color = color;
        bytes_infomation[i].type = type;
    }
    fill_offset += size;
}

function usePNGBackground() {
    fillSize(8, fill_palette.signature, "signature"); // PNG SIGNATURE
    let type;
    while (type != "IEND") {
        let length = binary[fill_offset] << 24 | binary[fill_offset + 1] << 16 | binary[fill_offset + 2] << 8 | binary[fill_offset + 3];
        fillSize(4, fill_palette.chunk_length, `chunk length [${length}]`); // CHUNK LENGTH
        type = String.fromCharCode(binary[fill_offset]) + String.fromCharCode(binary[fill_offset + 1]) + String.fromCharCode(binary[fill_offset + 2]) + String.fromCharCode(binary[fill_offset + 3]);
        fillSize(4, fill_palette.chunk_type `chunk type [${type}]`); // CHUNK TYPE (IHDR)
        if (type == "IHDR") {
            fillSize(4, fill_palette.chunk_data_0, "width"); // width
            fillSize(4, fill_palette.chunk_data_1, "height"); // height
            fillSize(1, fill_palette.chunk_data_0, "bit depth"); // bit depth
            fillSize(1, fill_palette.chunk_data_1, "color type"); // color type
            fillSize(1, fill_palette.chunk_data_0, "compression method"); // compression method
            fillSize(1, fill_palette.chunk_data_1, "filter method"); // filter method
            fillSize(1, fill_palette.chunk_data_0, "interlace method"); // interlace method
        } else if (type == "cHRM") {
            fillSize(4, fill_palette.chunk_data_0, "white point x"); // white point x
            fillSize(4, fill_palette.chunk_data_1, "white point y"); // white point y
            fillSize(4, fill_palette.chunk_data_0, "red x"); // red x
            fillSize(4, fill_palette.chunk_data_1, "red y"); // red y
            fillSize(4, fill_palette.chunk_data_0, "green x"); // green x
            fillSize(4, fill_palette.chunk_data_1, "green y"); // green y
            fillSize(4, fill_palette.chunk_data_0, "blue x"); // blue x
            fillSize(4, fill_palette.chunk_data_1, "blue y"); // blue y
        } else {
            fillSize(length, fill_palette.chunk_data_0, "chunk data"); // CHUNK DATA
        }
        fillSize(4, fill_palette.chunk_end, "chunk crc"); // CHUNK CRC
    }
}

function useJPEGBackground() {
    let markers = {
        0xFFC0: "SOF0",
        0xFFC1: "SOF1",
        0xFFC2: "SOF2",
        0xFFC3: "SOF3",
        0xFFC4: "DHT",
        0xFFC5: "SOF5",
        0xFFC6: "SOF6",
        0xFFC7: "SOF7",
        0xFFC8: "JPG",
        0xFFC9: "SOF9",
        0xFFCA: "SOF10",
        0xFFCB: "SOF11",
        0xFFCC: "DAC",
        0xFFCD: "SOF13",
        0xFFCE: "SOF14",
        0xFFCF: "SOF15",
        0xFFD0: "RST0",
        0xFFD1: "RST1",
        0xFFD2: "RST2",
        0xFFD3: "RST3",
        0xFFD4: "RST4",
        0xFFD5: "RST5",
        0xFFD6: "RST6",
        0xFFD7: "RST7",
        0xFFDA: "SOS",
        0xFFDB: "DQT",
        0xFFDC: "DNL",
        0xFFDD: "DRI",
        0xFFDE: "DHP",
        0xFFDF: "EXP",
        0xFFE0: "APP0",
        0xFFE1: "APP1",
        0xFFE2: "APP2",
        0xFFE3: "APP3",
        0xFFE4: "APP4",
        0xFFE5: "APP5",
        0xFFE6: "APP6",
        0xFFE7: "APP7",
        0xFFE8: "APP8",
        0xFFE9: "APP9",
        0xFFEA: "APP10",
        0xFFEB: "APP11",
        0xFFEC: "APP12",
        0xFFED: "APP13",
        0xFFEE: "APP14",
        0xFFEF: "APP15",
        0xFFF0: "JPG0",
        0xFFF1: "JPG1",
        0xFFF2: "JPG2",
        0xFFF3: "JPG3",
        0xFFF4: "JPG4",
        0xFFF5: "JPG5",
        0xFFF6: "JPG6",
        0xFFF7: "JPG7",
        0xFFF8: "JPG8",
        0xFFF9: "JPG9",
        0xFFFA: "JPG10",
        0xFFFB: "JPG11",
        0xFFFC: "JPG12",
        0xFFFD: "JPG13",
        0xFFFE: "COM"

    }
    fillSize(2, fill_palette.signature, "SOI (start of image)"); // SOI
    while (true) {

        if (binary[fill_offset] !== 0xFF) {
            break;
        }
        let marker = binary[fill_offset] << 8 | binary[fill_offset + 1];
        let marker_name = markers[marker];

        fillSize(2, fill_palette.chunk_type, `chunk type [${markers[marker] || "unknown"}]`); // MARKER

        let length = binary[fill_offset] << 8 | binary[fill_offset + 1];
        fillSize(2, fill_palette.chunk_length, `length [${length}]`); // LENGTH

        if (marker_name == "APP0") {
            fillSize(5, fill_palette.chunk_data_0, "identifier"); // IDENTIFIER
            fillSize(1, fill_palette.chunk_data_1, "minor version"); // MINOR VERSION
            fillSize(1, fill_palette.chunk_data_0, "major version"); // MAJOR VERSION
            fillSize(1, fill_palette.chunk_data_1, "units"); // UNITS
            fillSize(2, fill_palette.chunk_data_0, "x density"); // X DENSITY
            fillSize(2, fill_palette.chunk_data_1, "y density"); // Y DENSITY
            fillSize(1, fill_palette.chunk_data_0, "thumbnail x"); // THUMBNAIL X
            fillSize(1, fill_palette.chunk_data_1, "thumbnail y"); // THUMBNAIL Y
        } else if (marker_name == "DQT") {
            fillSize(1, fill_palette.chunk_data_1, "luminance"); // LUMINANCE
            fillSize(length - 3, fill_palette.chunk_data_0, "quantization table 8x8"); // QUANTIZATION TABLE
        }
        // else if (marker_name.startsWith("SOF")) {
        //     fillSize(1, fill_palette.chunk_data_1, "precision"); // PRECISION
        //     fillSize(2, fill_palette.chunk_data_0, "scan lines"); // SCAN LINES
        //     fillSize(2, fill_palette.chunk_data_1, "samples per line"); // SAMPLES PER LINE
        // }
        else {
            fillSize(length - 2, fill_palette.chunk_data_0, "chunk data"); // DATA
        }
    }

    fillSize(binary.length - fill_offset - 2, fill_palette.chunk_data_1, "image data"); // IMAGE DATA
    fillSize(2, fill_palette.chunk_end, "EOI (end of image)"); // EOI
}

function useSWFBackground(){
    fillSize(3, fill_palette.signature, "signature"); // SIGNATURE
}

file_chooser.addEventListener("change", e => {
    let file = file_chooser.files[0];
    let reader = new FileReader();
    reader.onload = function (e) {
        console.log("Loaded file: " + file.name);
        binary = new Uint8Array(e.target.result);
        bytes_infomation = new Array(binary.length).fill(null).map(x => {
            return {
                color: "rgb(255, 255, 255)",
                type: "byte"
            };
        });
        if (file.name.endsWith(".png")) {
            console.log("PNG detected");
            console.log("Painting chunks");
            usePNGBackground();
            console.log("Painting chunks done");
        } else if (file.name.endsWith(".jpg")) {
            console.log("PNG detected");
            console.log("Painting chunks");
            useJPEGBackground();
            console.log("Painting chunks done");
        } else {
            console.log("Unknown format");
        }
        offset = 0;
        scroll_bar_pos = 0;
    }
    console.log("Loading file...");
    reader.readAsArrayBuffer(file);
});

setInterval(() => {
    blink = !blink;
}, selected_blink_cooldown);