var gulp = require("gulp"),
  del = require("del"),
  uglify = require("gulp-uglify"),
  csso = require("gulp-csso"),
  jsxbin = require("jsxbin"),
  runSequence = require("run-sequence"),
  yuicompressor = require("gulp-yuicompressor"),
  zxpSignCmd = require("zxp-sign-cmd"),
  include = require("gulp-include"),
  replace = require("gulp-replace"),
  rename = require("gulp-rename"),
  // folder vars
  destinationFolder = "Install/",
  sourceFolder = "src/",
  panelName = "Zombietron";
compressed = true;
const { series, watch, src, dest } = require("gulp");
const fs = require("fs");
const shell = require("gulp-shell");
const concat = require("gulp-concat");
var cp = require("child_process");

function clean() {
  return del([destinationFolder + "**/*"]);
}

const copy = series(clean, function(cb) {
  return gulp
    .src(sourceFolder + "/**/*")
    .pipe(gulp.dest(destinationFolder + panelName));
  cb();
});

function compressJS() {
  return (
    gulp
      .src(destinationFolder + panelName + "/**/*.js")
      // .pipe(
      //   uglify().on("error", function(e) {
      //     console.log(e);
      //   })
      // )
      .pipe(gulp.dest(destinationFolder + panelName))
  );
}

function compressCSS() {
  return gulp
    .src(destinationFolder + panelName + "/**/*.css")
    .pipe(csso())
    .pipe(gulp.dest(destinationFolder + panelName));
}

const compressFiles = series(copy, compressCSS, compressJS, compressJSX);

function compressJSX() {
  var fileIn = destinationFolder + panelName + "/jsx/all.jsx";
  return gulp
    .src(fileIn)
    .pipe(replace(/^\s*(#include|\/\/\s*@include)/gm, "//= include"))
    .pipe(include())
    .pipe(
      yuicompressor({
        type: "js",
        "preserve-semi": true
      })
    )
    .pipe(gulp.dest(destinationFolder + panelName + "/jsx/"));
}

const jsxBin = series(compressJSX, function() {
  var jsxFolder = destinationFolder + panelName + "/jsx/";
  var fileIn = jsxFolder + "all.jsx";
  var fileOut = jsxFolder + "all.jsxbin";
  return jsxbin(fileIn)
    .then(function() {
      del(fileIn);
    })
    .then(function() {
      return gulp
        .src(fileOut)
        .pipe(
          rename({
            extname: ".jsx"
          })
        )
        .pipe(gulp.dest(jsxFolder));
    })
    .then(function() {
      del(fileOut);
      del(jsxFolder + "libs");
    });
});
function devBuildJSX(cb) {
  console.log(__dirname);
  return src([
    `${__dirname}/dev/jsx/*.jsx`,
    `${__dirname}/dev/jsx/return/zombietron-body.jsx`
  ])
    .pipe(concat("all.jsx"))
    .pipe(dest(`${__dirname}/src/jsx/`));
  cb();
}

function devBuildHTML(cb) {
  console.log(__dirname);
  console.log("Building HTML");
  return src([`${__dirname}/dev/html/zombietron.html`])
    .pipe(concat("index.html"))
    .pipe(dest(`${__dirname}/src/html/`));
  cb();
}
function devBuildJS(cb) {
  console.log(__dirname);
  return src(`${__dirname}/dev/js/*.js`)
    .pipe(concat("all.js"))
    .pipe(dest(`${__dirname}/src/js/`));
  cb();
}
function wrapJS(cb) {
  let header = `(function () {	/// wrapping in an anonymous function`;
  let footer = `})();`;
  fs.readFile(`${__dirname}/src/js/all.js`, "utf-8", function(err, content) {
    let newContent = header + "\n\n" + content + "\n\n" + footer;
    console.log(newContent);
    fs.writeFile(`${__dirname}/src/js/all.js`, newContent, () => {});
  });
  cb();
}

function wrapMain(cb) {
  let header = `var Zombietron = (function () {	/// this is the publicObject for the script`;
  let footer = `})();`;
  fs.readFile(`${__dirname}/src/jsx/all.jsx`, "utf-8", function(err, content) {
    // console.log(content);
    let newContent = header + "\n\n" + content + "\n\n" + footer;
    // console.log(newContent);
    fs.writeFile(`${__dirname}/src/jsx/all.jsx`, newContent, () => {});
  });
  cb();
}

exports.dev = function() {
  series(devBuildHTML, devBuildJSX, wrapMain, devBuildJS, wrapJS);
  watch(
    `${__dirname}/dev/html/*.html`,
    series(devBuildHTML, devBuildJSX, wrapMain, devBuildJS, wrapJS)
  );
  watch(
    `${__dirname}/dev/jsx/*.jsx`,
    series(devBuildHTML, devBuildJSX, wrapMain, devBuildJS, wrapJS)
  );
  watch(
    `${__dirname}/dev/js/*.js`,
    series(devBuildHTML, devBuildJSX, wrapMain, devBuildJS, wrapJS)
  );
};

exports.default = function() {
  watch(`${__dirname}/src/*.js`, series(clean, test, build));
};

async function createCert() {
  let certOptions = {
    country: "US",
    province: "IL",
    org: "AndrewRBrady",
    name: "BasicCert",
    password: "password",
    output: `${__dirname}/cert.p12`
  };
  const certificate = await zxpSignCmd.selfSignedCert(certOptions, function(
    err,
    result
  ) {
    return new Promise((resolve, reject) => {
      console.log(result);
      console.log("certificate result above");
      resolve();
    });
  });
  return new Promise((resolve, reject) => {
    console.log(certificate);
    console.log("certificate result above");
    resolve();
  });
}

async function signAndBuildZXP() {
  console.log("signing and building");
  let signOptions = {
    input: destinationFolder + panelName,
    output: destinationFolder + panelName + ".zxp",
    cert: `${__dirname}/cert.p12`,
    password: "password",
    timestamp: "http://timestamp.digicert.com"
  };
  const signResult = await zxpSignCmd.sign(signOptions, function(err, result) {
    return new Promise((resolve, reject) => {
      console.log(result);
      console.log("sign result above");
      resolve();
    });
  });
  return new Promise((resolve, reject) => {
    console.log(signResult);
    console.log("sign result above");
    resolve();
  });
}

const build = series(compressFiles, createCert, function() {
  signAndBuildZXP();
});

const cleanIntermediates = series(build, function() {
  console.log("done!");
  del(destinationFolder + panelName);
  return new Promise((resolve, reject) => {
    console.log(signResult);
    console.log("sign result above");
    resolve();
  });
});

exports.default = series(cleanIntermediates, function(res, err) {
  return new Promise((resolve, reject) => {
    console.log(signResult);
    console.log("sign result above");
    resolve();
  });
});
