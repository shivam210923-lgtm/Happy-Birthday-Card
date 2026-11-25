const axios = require("axios").default;
const path = require("path");
const fs = require("fs");
const setPic = require("./getPic");
const genIndex = require("./genIndex");
const {
  generateMarkupLocal,
  generateMarkupRemote,
} = require("./generateMarkup");

require("dotenv").config();

if (!process.env.NAME) throw new Error("Please specify NAME in environment.");
if (!process.env.PIC) throw new Error("Please specify PIC in environment.");

const picPath = process.env.PIC;
const msgPath = process.env.SCROLL_MSG;

//Local initialization
const setLocalData = async () => {
  try {
    const pic = path.join(__dirname, "../local/", picPath);
    let markup = "";
    if (msgPath) {
      const text = fs.readFileSync(path.join(__dirname, "../local/", msgPath), {
        encoding: "utf-8",
      });
      markup = generateMarkupLocal(text);
    }
    await setPic(pic);
    genIndex(markup);
  } catch (e) {
    throw new Error(e.message);
  }
};

//Remote initialization
const setRemoteData = async () => {
  try {
    let res;
    let pic;
    if (/^https?:\/\//i.test(picPath.trim())) {
      res = await axios.get(picPath.trim(), {
        responseType: "arraybuffer",
      });
      pic = res.data;
    } else {
      // PIC is not a web URL: try it as a file in ./local, else use the sample pic
      const localPic = path.join(__dirname, "../local/", picPath);
      pic = fs.existsSync(localPic) && fs.statSync(localPic).isFile()
        ? localPic
        : path.join(__dirname, "../local/sample-pic.jpeg");
      console.warn(
        "WARNING: PIC is not a web URL (expected https://...). Using " +
          path.basename(pic) +
          " instead. Set PIC to a direct image URL to show the receiver's photo."
      );
    }
    let markup = "";
    if (msgPath) {
      const article = msgPath.split("/").pop();
      res = await axios.get(
        `https://api.telegra.ph/getPage/${article}?return_content=true`
      );
      const { content } = res.data.result;
      markup = content.reduce(
        (string, node) => string + generateMarkupRemote(node),
        ""
      );
    }
    await setPic(pic);
    genIndex(markup);
  } catch (e) {
    throw new Error(e.message);
  }
};

const run = (fn) =>
  fn().catch((e) => {
    console.error(e);
    process.exit(1);
  });

if (process.argv[2] === "--local") run(setLocalData);
else if (process.argv[2] === "--remote") run(setRemoteData);
else console.log("Fetch mode not specified.");
