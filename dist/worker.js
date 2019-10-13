console.log('[Worker] Hi!')

onmessage = function (e) {
  var data = e.data
  console.log('[Worker] Received message:', data)

  if ((typeof data === 'object') && (data.url)) {
    /*
      INIT MESSAGE
    */
    let model = data

    if (model.dom) {
      console.log('[Worker] Loading jsdom')
      importScripts('jsdom.min.js')
      this.document = this.jsdom.JSDOM(`<!DOCTYPE html>`).window.document
    }

    if (model.type === 'py') {
      // Python with Pyodide
      importScripts('https://pyodide.cdn.iodide.io/pyodide.js')
      // Check when all's loaded
      let pyCheck = setInterval(() => {
        if (self.pyodide && self.pyodide.runPythonAsync && this.model && this.model.length) {
          console.log('[Worker] Pyodide lib and model loaded. Try running to preload all imports')
          self.pyodide.runPythonAsync(this.model, () => {})
            .then((res) => {
              postMessage({_status: 'loaded'})
            })
            .catch((err) => {
              postMessage({_status: 'loaded'})
            })
          clearInterval(pyCheck)
        }
      }, 500)
      // Load model
      fetch(model.url)
        .then(res => res.text())
        .then(res => {
          this.model = res
          console.log('[Worker] Loaded python model:', res)
        })
        .catch((err) => {
          console.log(err)
        })
    } else {
      // Javascript
      this.container = model.container || 'args'
      console.log('[Worker] Load script: ', model.url)
      importScripts(model.url)
      if (model.type === 'class') {
        console.log('[Worker] Init class')
        this.model = (new this[model.name]())[model.method || 'predict']
      } else if (model.type === 'async-init') {
        console.log('[Worker] Init function with promise')
        console.log(this[model.name])
        this[model.name]().then((m) => {
          console.log('[Worker] Async init resolved: ', m)
          this.model = m
        })
      } else {
        console.log('[Worker] Init function')
        this.model = this[model.name]
      }
    }
  } else {
    /*
      CALL MESSAGE
    */
    var res
    if (typeof this.model === 'string') {
      // Python model:
      console.log('[Worker] Calling Python model')
      const keys = Object.keys(data)
      for (let key of keys) {
        self[key] = data[key];
      }
      self.pyodide.runPythonAsync(this.model, () => {})
        .then((res) => {
          console.log('[Worker] Py results: ', typeof res, res)
	  postMessage(res)
        })
        .catch((err) => {
          // self.postMessage({error : err.message});
        })
    } else {
      // JavaScript model
      console.log('[Worker] Calling JavaScript model')
      if (this.container === 'args') {
        console.log('[Worker] Applying inputs as arguments')
        res = this.model.apply(null, data)
      } else {
        // JS object or array
        console.log('[Worker] Applying inputs as object/array')
        res = this.model(data)
      }
      // Return promise value or just regular value
      // Promise.resolve handles both cases
      Promise.resolve(res).then(r => { postMessage(r) })
    }
  }
}
