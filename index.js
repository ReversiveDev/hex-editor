const express = require("express");
let type = process.argv[2];

if(type == "web"){
    const app = express();
    app.use(express.static("web"));
    app.listen(8080, () => {
        console.log("Server is running on port 127.0.0.1:8080");   
    });
}else {
    require("./desktop")();
}