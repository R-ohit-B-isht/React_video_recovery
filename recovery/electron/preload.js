var sudo = require("sudo-prompt");
const { resolve } = require("path");

// const path = require('path');
// require("electron-reload")(__dirname);
const esr = resolve("./model/Real-esrgan/realesrgan-ncnn-vulkan.exe");
const esrw = esr.split("\\").join("\\\\");
const ffmpeg = resolve("./model/ffmpeg/bin/ffmpeg.exe");
const ffmpegw = ffmpeg.split("\\").join("\\\\");
const tmp_frames = resolve("./model/tmp_frames/");
const tmp_framesw = tmp_frames.split("\\").join("\\\\");
const out_frames = resolve("./model/out_frames/");
const out_framesw = out_frames.split("\\").join("\\\\");
const exec = require("child_process").exec;
const fs = require("fs");

const child_process = require("child_process");
var options = {
  name: "Electron",
  icns: "/Applications/Electron.app/Contents/Resources/Electron.icns", // (optional)
};
const { ipcRenderer, contextBridge } = require("electron");

const WINDOW_API = {
  GetVersion: () => ipcRenderer.invoke("get/version"),
  Realesrgan: (inp, out) =>
    exec(
      esrw + " -i " + inp + " -o " + out,
      options,
      function (error, stdout, stderr) {
        if (error) throw error;
        console.log("stdout: " + stdout);
        return 1;
      }
    ),
  empty_tmp_frames: () =>
    exec("rm " + tmp_framesw + "/*", options, function (error, stdout, stderr) {
      if (error) throw error;
      console.log("stdout: " + stdout);
      return 1;
    }),
  empty_out_frames: () =>
    exec("rm " + out_framesw + "/*", options, function (error, stdout, stderr) {
      if (error) throw error;
      console.log("stdout: " + stdout);
    }),
  Ffmpeg: (inp) =>
    exec(
      ffmpegw +
        " -i " +
        inp +
        " -qscale:v 1 -qmin 1 -qmax 1 -vsync 0 " +
        tmp_framesw +
        "/frame%08d.jpg",
      options,
      function (error, stdout, stderr) {
        if (error) throw error;
        console.log("stdout: " + stdout);
      }
    ),
  Realesrgan_frames: () =>
    exec(
      esrw +
        " -i " +
        tmp_framesw +
        " -o " +
        out_framesw +
        " -n realesr-animevideov3 -s 2 -f jpg",
      options,
      function (error, stdout, stderr) {
        if (error) throw error;
        console.log("stdout: " + stdout);
      }
    ),
  MergeFrames: (inp, out) =>
    exec(
      ffmpegw +
        " -i " +
        out_framesw +
        "/frame%08d.jpg" +
        " -i " +
        inp +
        "  -map 0:v:0 -map 1:a:0 -c:a copy -c:v libx264 -r 23.98 -pix_fmt yuv420p " +
        out,
      options,
      function (error, stdout, stderr) {
        if (error) throw error;
        console.log("stdout: " + stdout);
      }
    ),
  Clean: () => {
    empty_my_tmp();
    empty_my_out();
  },
  Realesrgan_on_Video: (inp, out) =>
    exec(
      ffmpegw +
        " -i " +
        inp +
        " -qscale:v 1 -qmin 1 -qmax 1 -vsync 0 " +
        tmp_framesw +
        "/frame%08d.jpg" +
        " & " +
        esrw +
        " -i " +
        tmp_framesw +
        " -o " +
        out_framesw +
        " -n realesr-animevideov3 -s 2 -f jpg" +
        " & " +
        ffmpegw +
        " -i " +
        out_framesw +
        "/frame%08d.jpg" +
        " -i " +
        inp +
        "  -map 0:v:0 -map 1:a:0 -c:a copy -c:v libx264 -r 23.98 -pix_fmt yuv420p " +
        out,
      options,
      function (error, stdout, stderr) {
        if (error) throw error;
        console.log("stdout: " + stdout);
      }
    ),
  FilesInTemp: () =>
    fs.readdir(tmp_framesw, function (err, files) {
      if (err) {
        throw err;
      } else {
        return files.length;
      }
    }),
  FilesInOut: () =>
    fs.readdir(out_framesw, function (err, files) {
      if (err) {
        throw err;
      } else {
        return files.length;
      }
    }),
};
function empty_my_tmp() {
  return new Promise((resolve, reject) => {
    resolve(
      fs.readdir(tmp_framesw, function (err, files) {
        if (err) {
          throw err;
        } else {
          //remove all files in tmp_frames if its not empty
          if (files.length > 0) {
            WINDOW_API.empty_tmp_frames();
          }
        }
      })
    );
  });
}
function empty_my_out() {
  return new Promise((resolve, reject) => {
    emptying_out_copy = 0;
    fs.readdir(out_framesw, function (err, files) {
      if (err) {
        throw err;
      } else {
        //remove all files in out_framesw if its not empty
        if (files.length > 0) {
          WINDOW_API.empty_out_frames();
        }
      }
    });
  });
}
function generate_tmp_frames(inp) {
  return new Promise((resolve, reject) => {
    WINDOW_API.Ffmpeg(inp);
  });
}
function rersgan_tmp_frames() {
  return new Promise((resolve, reject) => {
    WINDOW_API.Realesrgan_frames();
  });
}
function merge_out_frames(inp, out) {
  return new Promise((resolve, reject) => {
    WINDOW_API.MergeFrames(inp, out);
  });
}
function finalone(inp, out) {
  fs.readdir(tmp_framesw, function (err, files) {
    if (err) {
      throw err;
    } else {
      if (files.length > 0) {
        WINDOW_API.empty_tmp_frames();
      }
    }
  });
  fs.readdir(tmp_framesw, function (err, files) {
    if (err) {
      throw err;
    } else {
      if (files.length > 0) {
        WINDOW_API.empty_out_frames();
      }
    }
  });
  WINDOW_API.Ffmpeg(inp);
  WINDOW_API.Realesrgan_frames();
  WINDOW_API.MergeFrames(inp, out);
}

contextBridge.exposeInMainWorld("api", WINDOW_API);
