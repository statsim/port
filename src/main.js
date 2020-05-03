const FileSaver = require('file-saver')

const templates = require('./templates')
const elements = require('./elements')

const fetch = window['fetch']
const Blob = window['Blob']

const version = '0.0.9'

// const Worker = window['Worker']

// Deep clone a simple object
function clone (obj) {
  // return JSON.parse(JSON.stringify(obj))
  return Object.assign({}, obj)
}

// https://stackoverflow.com/questions/8511281/check-if-a-value-is-an-object-in-javascript
function isObject (item) {
  return (typeof item === 'object' && !Array.isArray(item) && item !== null)
}

// Create a dom element from string
// https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro/35385518#35385518
function htmlToElement (html) {
  let template = document.createElement('template')
  html = html.trim()
  template.innerHTML = html
  return template.content.firstChild
}

class Port {
  constructor (params) {
    console.log('[Port] Initializing Port with params: ', params)
    params.schema = params.schema || params.config
    this.params = params
    this.__version__ = version

    this.overlay = document.createElement('div')
    this.overlay.id = 'overlay'
    this.overlay.className = 'valign-wrapper'
    this.overlay.innerHTML = `
      <div class="center-align" style="width:100%">
        <div class="preloader-wrapper small active">
          <div class="spinner-layer spinner-green-only">
            <div class="circle-clipper left">
              <div class="circle"></div>
            </div><div class="gap-patch">
              <div class="circle"></div>
            </div><div class="circle-clipper right">
              <div class="circle"></div>
            </div>
          </div>
        </div>
      </div>
    `

    // Get schema then initialize a model
    if (params.schema) {
      if (typeof params.schema === 'object') {
        console.log('[Port] Received schema as object: ', params.schema)
        this.init(params.schema)
      } else if (typeof params.schema === 'string') {
        console.log('[Port] Received schema as string: ', params.schema)
        this.schemaUrl = params.schema.indexOf('json') ? params.schema : params.schema + '.json'
        fetch(this.schemaUrl)
          .then(res => res.json())
          .then(res => {
            console.log('[Port] Loaded schema:', res)
            this.init(res)
          })
          .catch((err) => {
            console.log(err)
          })
      }
    }
  }

  _showOverlay () {
    this.overlay.style.display = 'flex'
  }

  _hideOverlay () {
    this.overlay.style.display = 'none'
  }

  // Initialize model from schema
  init (schema) {
    console.log('[Port] Initializing schema', schema)

    // Convert JS code to string
    if (schema.model.code && (typeof schema.model.code !== 'string')) {
      console.log('[Port] Convert code in schema to string')
      schema.model.code = schema.model.code.toString()
    }

    // Check for worker flag
    if (typeof schema.model.worker === 'undefined') {
      schema.model.worker = true
    }

    // Check if name is present, if not - get name from the file
    if (typeof schema.model.name === 'undefined') {
      // Two options here
      if (schema.model.url) {
        // 1. Get the name from the file name
        schema.model.name = schema.model.url.split('/').pop().split('.')[0]
        console.log('[Port] Use name from url: ', schema.model.name)
      } else if (schema.model.code) {
        // 2. Get the name from the url
        schema.model.name = schema.model.code.name
        console.log('[Port] Use name from code: ', schema.model.name)
      }
    }

    this.schema = clone(schema)

    if (this.params.portContainer) {
      console.log('[Port] Init port element')
      // Get layout name
      const layout = (this.schema.design && this.schema.design.layout) ? this.schema.design.layout : 'blocks'
      const portElement = htmlToElement(templates[layout])
      this.params.portContainer.appendChild(portElement)
      // Get input, output and model containers
      this.inputsContainer = portElement.querySelector('#inputs')
      this.outputsContainer = portElement.querySelector('#outputs')
      this.modelContainer = portElement.querySelector('#model')
      // Make run button active
      if (!this.schema.model.autorun) {
        let runButton = portElement.querySelector('#run')
        runButton.style.display = 'inline-block'
        runButton.onclick = () => {
          this.run()
        }
      }
    } else {
      this.inputsContainer = this.params.inputsContainer
      this.outputsContainer = this.params.outputsContainer
      this.modelContainer = this.params.modelContainer
    }

    // Init overlay
    this.inputsContainer.appendChild(this.overlay)

    console.log('[Port] Init inputs, outputs and model description')

    // Update model URL if needed
    if (this.schema.model.url && !this.schema.model.url.includes('/') && this.schemaUrl && this.schemaUrl.includes('/')) {
      let oldModelUrl = this.schema.model.url
      console.log(this.schemaUrl)
      this.schema.model.url = window.location.protocol + '//' + window.location.host + this.schemaUrl.split('/').slice(0, -1).join('/') + '/' + oldModelUrl
      console.log('[Port] Changed the old model URL to absolute one:', oldModelUrl, this.schema.model.url)
    }

    // Iniitialize model description
    if (this.modelContainer && this.schema.model) {
      if (this.schema.model.title) {
        let h = document.createElement('h4')
        h.className = 'port-title'
        h.innerText = this.schema.model.title
        this.modelContainer.appendChild(h)
      }
      if (this.schema.model.description) {
        let desc = document.createElement('p')
        desc.className = 'model-info'
        desc.innerText = this.schema.model.description + ' '
        let a = document.createElement('a')
        a.innerText = '→'
        a.href = this.schema.model.url
        desc.appendChild(a)
        this.modelContainer.appendChild(desc)
      }
    }

    // Initialize inputs
    this.schema.inputs.forEach((input, i) => {
      console.log(input)
      let element
      switch (input.type) {
        case 'int':
        case 'float':
        case 'string':
          element = new elements.InputElement(input)
          break
        case 'checkbox':
          element = new elements.CheckboxElement(input)
          break
        case 'range':
          element = new elements.RangeElement(input)
          window['M'].Range.init(element.inputElement)
          break
        case 'text':
          element = new elements.TextareaElement(input)
          break
        case 'select':
        case 'categorical':
          element = new elements.SelectElement(input)
          break
        case 'file':
          element = new elements.FileElement(input)
          break
        case 'image':
          element = new elements.ImageElement(input)
          break
      }

      if (input.onchange && !element.inputElement.onchange) {
        setTimeout(() => {
          this.output(input.onchange(element.getValue()))
        }, 0)
      }

      // Add onchange listener to original input element if model has autorun flag
      if (this.schema.model.autorun || input.reactive || input.onchange) {
        if (input.type === 'file') {
          element.cb = this
        } else {
          element.inputElement.onchange = () => {
            console.log('[Input] Change event')
            if (input.onchange) {
              this.output(input.onchange(element.getValue()))
            }
            if (this.schema.model.autorun || input.reactive) {
              this.run()
            }
          }
        }
      }

      // Add element to input object
      input.element = element
      this.inputsContainer.appendChild(element.element)
    })

    // Init Material framework
    var selectElements = document.querySelectorAll('select')
    window['M'].FormSelect.init(selectElements, {})

    // Init Model
    // ----------
    if (this.schema.model.type === 'py') {
      // Add loading indicator
      this._showOverlay()
      let script = document.createElement('script')
      script.src = 'https://pyodide.cdn.iodide.io/pyodide.js'
      script.onload = () => {
        window['M'].toast({html: 'Loaded: Python'})
        window['languagePluginLoader'].then(() => {
          fetch(this.schema.model.url)
            .then(res => res.text())
            .then(res => {
              console.log('[Port] Loaded python code:', res)
              this.pymodel = res
              // Here we filter only import part to know load python libs
              let imports = res.split('\n').filter(str => (str.includes('import ')) && !(str.includes('#')) && !(str.includes(' js '))).join('\n')
              console.log('Imports: ', imports)
              window['pyodide'].runPythonAsync(imports, () => {})
                .then((res) => {
                  window['M'].toast({html: 'Loaded: Dependencies'})
                  this._hideOverlay()
                })
                .catch((err) => {
                  console.log(err)
                  window['M'].toast({html: 'Error loading libs'})
                  this._hideOverlay()
                })
            })
            .catch((err) => {
              console.log(err)
              window['M'].toast({html: 'Error loading python code'})
              this._hideOverlay()
            })
        })
      }
      document.head.appendChild(script)
    } else if (['function', 'class', 'async-init', 'async-function'].includes(this.schema.model.type)) {
      // Initialize worker with the model
      if (this.schema.model.worker) {
        this.worker = new Worker('./worker-temp.js')
        if (this.schema.model.url) {
          fetch(this.schema.model.url)
            .then(res => res.text())
            .then(res => {
              console.log('[Port] Loaded js code for worker')
              this.schema.model.code = res
              this.worker.postMessage(this.schema.model)
            })
        } else if (typeof this.schema.model.code !== 'undefined') {
          this.worker.postMessage(this.schema.model)
        } else {
          window['M'].toast({html: 'Error. No code provided'})
        }

        this.worker.onmessage = (e) => {
          this._hideOverlay()
          const data = e.data
          console.log('[Port] Response from worker:', data)
          if ((typeof data === 'object') && (data._status)) {
            switch (data._status) {
              case 'loaded':
                window['M'].toast({html: 'Loaded: JS model (in worker)'})
                break
            }
          } else {
            this.output(data)
          }
        }
        this.worker.onerror = (e) => {
          this._hideOverlay()
          window['M'].toast({html: e.message, classes: 'error-toast'})
          console.log('[Port] Error from worker:', e)
        }
      } else {
        // Initialize model in main window
        console.log('[Port] Init model in window')
        let script = document.createElement('script')
        script.src = this.schema.model.url
        script.onload = () => {
          window['M'].toast({html: 'Loaded: JS model'})
          this._hideOverlay()
          console.log('[Port] Loaded JS model in main window')

          // Initializing the model (same in worker)
          if (this.schema.model.type === 'class') {
            console.log('[Port] Init class')
            const modelClass = new window[this.schema.model.name]()
            this.modelFunc = (...a) => {
              return modelClass[this.schema.model.method || 'predict'](...a)
            }
          } else if (this.schema.model.type === 'async-init') {
            console.log('[Port] Init function with promise')
            window[this.schema.model.name]().then((m) => {
              console.log('[Port] Async init resolved: ', m)
              this.modelFunc = m
            })
          } else {
            console.log('[Port] Init function')
            this.modelFunc = window[this.schema.model.name]
          }
        }
        document.head.appendChild(script)
      }
    } else if (this.schema.model.type === 'tf') {
      // Initialize TF
      let script = document.createElement('script')
      script.src = 'dist/tf.min.js'
      script.onload = () => {
        console.log('[Port] Loaded TF.js')
        this._hideOverlay()
        window['tf'].loadLayersModel(this.schema.model.url).then(res => {
          console.log('[Port] Loaded Tensorflow model')
        })
      }
      document.head.appendChild(script)
    }

    // Init render
    // -----------
    if (this.schema.render && this.schema.render.url) {
      console.log('[Port] Init render in window')
      let script = document.createElement('script')
      script.src = this.schema.render.url
      script.onload = () => {
        window['M'].toast({html: 'Loaded: JS render'})
        console.log('[Port] Loaded JS render')

        // Initializing the render (same in worker)
        if (this.schema.render.type === 'class') {
          console.log('[Port] Init render as class')
          const renderClass = new window[this.schema.render.name]()
          this.renderFunc = (...a) => {
            return renderClass[this.schema.render.method || 'render'](...a)
          }
        } else if (this.schema.render.type === 'async-init') {
          console.log('[Port] Init render function with promise')
          window[this.schema.render.name]().then((m) => {
            console.log('[Port] Async rebder init resolved: ', m)
            this.renderFunc = m
          })
        } else {
          console.log('[Port] Init render as function')
          this.renderFunc = window[this.schema.render.name]
        }
      }
      document.head.appendChild(script)
    }
  }

  run () {
    const schema = this.schema
    console.log('[Port] Running the model')
    // Collect input values
    let inputValues
    if (schema.model && schema.model.container && schema.model.container === 'args') {
      console.log('[Port] Pass inputs as function arguments')
      inputValues = schema.inputs.map(input => {
        return input.element.getValue()
      })
    } else {
      console.log('[Port] Pass inputs in an object')
      inputValues = {}
      schema.inputs.forEach(input => {
        if (input.element) {
          inputValues[input.name] = input.element.getValue()
        }
      })
    }
    // We have all input values here, pass them to worker, window.modelFunc or tf
    this._showOverlay()
    console.log('[Port] Input values: ', inputValues)
    switch (schema.model.type) {
      case 'tf':
        break
      case 'py':
        /*
        const keys = Object.keys(inputValues)
        for (let key of keys) {
          window[key] = inputValues[key]
        }
        */
        window['inputs'] = inputValues
        window['pyodide'].runPythonAsync(this.pymodel, () => {})
          .then((res) => {
            this.output(res)
            // console.log(res)
            // window['M'].toast({html: 'Model and libs loaded'})
          })
          .catch((err) => {
            console.log(err)
            window['M'].toast({html: 'Error in code'})
          })
        break

      case 'class':
      case 'function':
      case 'async-init':
      case 'async-function':
        if (this.schema.model.worker) {
          this.worker.postMessage(inputValues)
        } else {
          // Run in main window
          var res
          if (this.schema.model.container === 'args') {
            res = this.modelFunc.apply(null, inputValues)
          } else {
            console.log('[Port] Applying inputs as object')
            res = this.modelFunc(inputValues)
          }
          console.log('[Port] modelFunc results:', res)
          Promise.resolve(res).then(r => { this.output(r) })
        }
        break
      case 'api':
        break
    }
  }

  _showOutput (value, output) {
    console.log('[Port] Show output: ', value, output)
    switch (output.type) {
      case 'file':
        let fileBlob = new Blob([value.content || value], {type: 'text/plain;charset=utf-8'})
        let a = document.createElement('a')
        a.className = 'waves-effect waves-light btn'
        a.innerText = 'Download ' + value.filename || ''
        a.onclick = () => {
          FileSaver.saveAs(fileBlob, value.filename || 'output')
        }
        this.outputsContainer.appendChild(a)
        break
      case 'svg':
        // Append svg element
        let svgContainer = document.createElement('div')
        svgContainer.innerHTML = value
        this.outputsContainer.appendChild(svgContainer)

        // Append download button
        let svgBlob = new Blob([value.content || value], {type: 'text/plain;charset=utf-8'})
        let svgDownloadButton = document.createElement('a')
        svgDownloadButton.className = 'waves-effect waves-light btn'
        svgDownloadButton.innerText = 'Download' + value.filename || ''
        svgDownloadButton.onclick = () => {
          FileSaver.saveAs(svgBlob, value.filename || 'output.svg')
        }
        this.outputsContainer.appendChild(svgDownloadButton)
        break
      default:
        let collection = document.createElement('ul')
        collection.className = 'collection'

        let collectionItem = document.createElement('li')
        collectionItem.className = 'collection-item port-collection-item'
        collectionItem.innerText = value
        collection.appendChild(collectionItem)

        if (output.name && output.name.length) {
          let spanElement = document.createElement('span')
          spanElement.className = 'badge port-badge'
          spanElement.innerText = output.name
          collectionItem.appendChild(spanElement)
        }

        this.outputsContainer.appendChild(collection)
    }
  }

  output (data) {
    // const blob = new Blob([file], { type: type || 'application/*' });
    // const file = window.URL.createObjectURL(blob)

    // TODO: Think about all edge cases
    // * No output field, but reactivity
    this._hideOverlay()

    if (typeof data === 'undefined') {
      return
    }

    console.log('[Port] Got output results of type:', typeof data)
    const inputNames = this.schema.inputs.map(i => i.name)
    if (isObject(data) && Object.keys(data).every(key => inputNames.includes(key))) {
      // Update inputs
      console.log('[Port] Updating inputs:', Object.keys(data))
      this.schema.inputs.forEach((input, i) => {
        if (input.name && (typeof data[input.name] !== 'undefined')) {
          console.log(input)
          const el = input.element.inputElement
          console.log('[Port] Update input: ', input.name, el, 'with data:', data[input.name])
          const d = data[input.name]
          if (typeof d === 'object') {
            Object.keys(d).forEach(k => {
              if (k === 'options') {
                while (el.length) {
                  el.remove(el.length - 1)
                }
                d[k].forEach(o => {
                  const option = document.createElement('option')
                  option.text = o
                  el.add(option)
                })
              } else if ((typeof el[k] === 'object') && (typeof d[k] === 'object')) {
                Object.assign(el[k], d[k])
              } else {
                el[k] = d[k]
              }
            })
          } else {
            el.value = d
          }
          // Fix labels stuck on top of inputs
          // https://stackoverflow.com/questions/54206131/changing-the-value-of-html-input-tag
          window['M'].updateTextFields()
        }
      })
    } else if (this.renderFunc) {
      // Pass data to the custom render function
      console.log('[Port] Call render function')
      this.renderFunc(data)
    } else if (Array.isArray(data) && this.schema.outputs && this.schema.outputs.length) {
      // Display array output
      this.outputsContainer.innerHTML = ''
      let arrData
      if (data.length === this.schema.outputs.length) {
        arrData = data
      } else if (Array.isArray(data[0]) && (data[0].length === this.schema.outputs.length)) {
        arrData = data[0]
      }
      if (Array.isArray(arrData)) {
        this.schema.outputs.forEach((output, i) => {
          this._showOutput(arrData[i], output)
        })
      } else {
        this._showOutput(data, this.schema.outputs[0])
      }
    } else if (typeof data === 'object') {
      this.outputsContainer.innerHTML = ''
      let updatedSomething = false
      if (this.schema.outputs) {
        this.schema.outputs.forEach((output, i) => {
          if (output.name && (typeof data[output.name] !== 'undefined')) {
            console.log('[Port] Show output: ', output.name)
            this._showOutput(data[output.name], output)
            updatedSomething = true
          }
        })
      }
      if (!updatedSomething) {
        let pre = document.createElement('pre')
        pre.innerText = JSON.stringify(data, null, 2)
        this.outputsContainer.appendChild(pre)
      }
    } else if (this.schema.outputs && this.schema.outputs.length === 1) {
      // One output value passed as raw js object
      this.outputsContainer.innerHTML = ''
      this._showOutput(data, this.schema.outputs[0])
    } else {
      this.outputsContainer.innerHTML += data
    }
  }
}

module.exports = Port
