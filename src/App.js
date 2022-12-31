// import { useState, useMemo } from 'react'
// import { FilesViewer } from './FilesViewer'

// const fs = window.require('fs')
// const pathModule = window.require('path')

// const { app } = window.require('@electron/remote')

// const formatSize = size => {
//   var i = Math.floor(Math.log(size) / Math.log(1024))
//   return (
//     (size / Math.pow(1024, i)).toFixed(2) * 1 +
//     ' ' +
//     ['B', 'kB', 'MB', 'GB', 'TB'][i]
//   )
// }

// function App() {
//   const [path, setPath] = useState(app.getAppPath())

//   const files = useMemo(
//     () =>
//       fs
//         .readdirSync(path)
//         .map(file => {
//           const stats = fs.statSync(pathModule.join(path, file))
//           return {
//             name: file,
//             size: stats.isFile() ? formatSize(stats.size ?? 0) : null,
//             directory: stats.isDirectory()
//           }
//         })
//         .sort((a, b) => {
//           if (a.directory === b.directory) {
//             return a.name.localeCompare(b.name)
//           }
//           return a.directory ? -1 : 1
//         }),
//     [path]
//   )

//   const onBack = () => setPath(pathModule.dirname(path))
//   const onOpen = folder => setPath(pathModule.join(path, folder))

//   const [searchString, setSearchString] = useState('')
//   const filteredFiles = files.filter(s => s.name.startsWith(searchString))

//   return (
//     <div className="container mt-2">
//       <h4>{path}</h4>
//       <div className="form-group mt-4 mb-2">
//         <input
//           value={searchString}
//           onChange={event => setSearchString(event.target.value)}
//           className="form-control form-control-sm"
//           placeholder="File search"
//         />
//       </div>
//       <FilesViewer files={filteredFiles} onBack={onBack} onOpen={onOpen} />
//     </div>
//   )
// }

// export default App


import { useState, useMemo } from 'react'

const fs = window.require('fs')
const pathModule = window.require('path')

const { app } = window.require('@electron/remote')

const { resolve } = window.require("path");

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
const exec = window.require("child_process").exec;


var options = {
  name: "Electron",
  icns: "/Applications/Electron.app/Contents/Resources/Electron.icns", // (optional)
};
const { ipcRenderer, contextBridge } = window.require("electron");

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


// contextBridge.exposeInMainWorld("api", WINDOW_API);

	let realesr;
	// let fileInput="C:/Users/rbtun/Videos/V/realesrgan-ncnn-vulkan-20220424-windows/input.jpg";
	var fileInput=undefined;
	let fileOutput="C:/Users/rbtun/Videos/V/realesrgan-ncnn-vulkan-20220424-windows/output.png";
	let tmpFiles=0;

	
	const apply_realesr=()=>{
		let esrw=fileInput.split('\\').join('/')
		let out=esrw.substring(0,esrw.lastIndexOf("/")+1)+"output.png"
		console.log(out)
		 return realesr= WINDOW_API.Realesrgan(esrw,out)
		 console.log(realesr)
	}

	function call_apply_realesr(){
	let  x;
	x=	apply_realesr()
	if(x==undefined)
		console.log("undefined")
	else
		console.log("done")
	}
	const apply_realesr_on_video=async()=>{
		let esrw=fileInput.split('\\').join('/')
		let out=esrw.substring(0,esrw.lastIndexOf("/")+1)+"output_Video.mp4"
		console.log(out)
		realesr= await WINDOW_API.Realesrgan_on_Video(esrw,out)
		files_in_temp()
	}

  const onDrop = files => {
	fileInput=files[0].path;
	alert(fileInput)
} 

async function clear_fileInput(){
	fileInput=""
	await WINDOW_API.Clean()
	files_in_temp()
}
function get_fileInput(){
	return fileInput
}
function files_in_temp(){
	tmpFiles= WINDOW_API.FilesInTemp()
	console.log(tmpFiles)
	
}
function files_in_out(){
	return WINDOW_API.FilesInOut()
}




function App() {
  const[version,setVersion]=useState("");
  const get_version=async()=>{
		setVersion(await WINDOW_API.GetVersion())
	}
    return (
      <div>
<h1>hi{version}</h1>
<button class="ui button" onClick={get_version}>click me</button>
      </div>
      
  
  )
}

export default App
