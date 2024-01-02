// reduce the resolution of every image in the current directory
// by settings the width to 640px and the height to 480px
// keep the aspect ratio, filling the rest with white

const fs = require("fs")
const path = require("path")
const gm = require("gm")
const async = require("async")

// install gm/convert first using sudo apt-get install graphicsmagick

const dir = process.cwd()
const files = fs.readdirSync(dir)

const maxWidth = 640
const maxHeight = maxWidth * (2 / 3)

async.each(
  files,
  function (file, callback) {
    const ext = path.extname(file)
    if (ext === ".jpg") {
      const img = gm(path.join(dir, file))
      img.size(function (err, size) {
        if (err) {
          callback(err)
        } else {
          let w = size.width
          let h = size.height
          if (w > maxWidth) {
            h = Math.floor((h * maxWidth) / w)
            w = maxWidth
          }
          if (h > maxHeight) {
            w = Math.floor((w * maxHeight) / h)
            h = maxHeight
          }

          const filename = path.basename(file, ext)
          img
            .resize(w, h)
            .gravity("Center")
            .extent(640, 480)
            .write(path.join(dir, `${filename}.png`), callback)
        }
      })
    } else {
      callback()
    }
  },
  function (err) {
    if (err) {
      console.error(err)
    } else {
      console.log("all done")
    }
  }
)
