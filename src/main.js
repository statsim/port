const parseCSV = require('csv-parse/lib/sync')
const FileSaver = require('file-saver')
const templates = require('./templates')

const fetch = window['fetch']
const Blob = window['Blob']
const Worker = window['Worker']
const FileReader = window['FileReader']

// Deep clone a simple object
function clone (obj) {
  return JSON.parse(JSON.stringify(obj))
}

// Create a dom element from string
// https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro/35385518#35385518
function htmlToElement (html) {
  let template = document.createElement('template')
  html = html.trim()
  template.innerHTML = html
  return template.content.firstChild
}

class InputElement {
  constructor (input) {
    let name = input.name || 'Input'
    let wrapper = document.createElement('div')
    wrapper.className = 'input-field'

    let inputElement = document.createElement('input')

    switch (input.type) {
      case 'int':
        inputElement.type = 'number'
        inputElement.step = 1
        break
      case 'float':
        inputElement.type = 'number'
        break
      case 'string':
        inputElement.type = 'text'
        break
    }

    let labelElement = document.createElement('label')
    labelElement.className = 'active'
    labelElement.innerText = name

    wrapper.appendChild(inputElement)
    wrapper.appendChild(labelElement)

    this.type = input.type
    this.inputElement = inputElement
    this.element = wrapper
  }

  getValue () {
    switch (this.type) {
      case 'int':
        return parseInt(this.inputElement.value)
      case 'float':
        return parseFloat(this.inputElement.value)
      case 'string':
        return this.inputElement.value
    }
  }
}

class TextareaElement {
  constructor (input) {
    let name = input.name || 'Input'
    let wrapper = document.createElement('div')
    wrapper.className = 'input-field'

    let textareaElement = document.createElement('textarea')
    textareaElement.className = 'materialize-textarea'
    textareaElement.rows = 5

    let labelElement = document.createElement('label')
    labelElement.innerText = name

    wrapper.appendChild(textareaElement)
    wrapper.appendChild(labelElement)

    this.inputElement = textareaElement
    this.element = wrapper
  }

  getValue () {
    return this.inputElement.value
  }
}

class SelectElement {
  constructor (input) {
    let name = input.name || 'Input'
    let wrapper = document.createElement('div')
    wrapper.className = 'input-field'

    let selectElement = document.createElement('select')
    selectElement.className = 'browser-default'

    input.values.forEach((val, i) => {
      let optionElement = document.createElement('option')
      optionElement.value = i
      optionElement.innerText = val
      selectElement.appendChild(optionElement)
    })

    let labelElement = document.createElement('label')
    labelElement.className = 'active'
    labelElement.innerText = name

    wrapper.appendChild(selectElement)
    wrapper.appendChild(labelElement)

    this.inputElement = selectElement
    this.element = wrapper
  }

  getValue () {
    return this.inputElement.value
  }
}

class FileElement {
  constructor (input) {
    console.log('[Port] Input object: ', input)

    this.value = null
    this.file = null
    this.parse = input.parse === true

    let wrapper = document.createElement('div')
    wrapper.className = 'file-field input-field'

    let btnElement = document.createElement('div')
    btnElement.className = 'btn'

    let spanElement = document.createElement('span')
    spanElement.innerText = 'File'
    btnElement.appendChild(spanElement)

    let inputElement = document.createElement('input')
    inputElement.type = 'file'
    inputElement.addEventListener('change', (e) => {
      const reader = new FileReader()
      this.file = e.target.files[0]
      window['readertmp'] = reader
      reader.readAsText(this.file)
      reader.onload = () => {
        this.value = reader.result
      }
      console.log('[Port] Loaded new file: ', this.file.name, this.file.size)
    }, false)
    btnElement.appendChild(inputElement)

    let wrapperElement = document.createElement('div')
    wrapperElement.className = 'file-path-wrapper'

    let textInputElement = document.createElement('input')
    textInputElement.type = 'text'
    textInputElement.className = 'file-path validate'
    wrapperElement.appendChild(textInputElement)

    wrapper.appendChild(btnElement)
    wrapper.appendChild(wrapperElement)

    this.inputElement = inputElement
    this.element = wrapper
  }

  getValue () {
    if (this.parse) {
      return parseCSV(this.value, {
        // columns: true,
        skip_empty_lines: true
      })
    }
    return this.value
  }
}

class Port {
  constructor (params) {
    console.log('[Port] Initializing Port with params: ', params)
    this.params = params

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

  // Initialize model from schema
  init (schema) {
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
      portElement.querySelector('#run').onclick = () => {
        this.run()
      }
    } else {
      this.inputsContainer = this.params.inputsContainer
      this.outputsContainer = this.params.outputsContainer
      this.modelContainer = this.params.modelContainer
    }

    console.log('[Port] Init inputs, outputs and model description')

    // Update model URL if needed
    if (this.schema.model.url && !this.schema.model.url.includes('/') && this.schemaUrl.includes('/')) {
      let oldModelUrl = this.schema.model.url
      this.schema.model.url = this.schemaUrl.split('/').slice(0, -1).join('/') + '/' + oldModelUrl
      console.log('[Port] Changed the old model URL to absolute one:', oldModelUrl, this.schema.model.url)
    }

    // Iniitialize model description
    if (this.modelContainer && this.schema.model) {
      let h = document.createElement('h4')
      h.innerText = this.schema.model.title || this.schema.model.name
      this.modelContainer.appendChild(h)
      let desc = document.createElement('p')
      desc.className = 'model-info'
      if (this.schema.model.description) {
        desc.innerText = this.schema.model.description + ' '
      }
      let a = document.createElement('a')
      a.innerText = '→'
      a.href = this.schema.model.url
      desc.appendChild(a)
      this.modelContainer.appendChild(desc)
    }

    // Initialize inputs
    this.schema.inputs.forEach((input, i) => {
      console.log(input)
      let element
      switch (input.type) {
        case 'int':
        case 'float':
        case 'string':
          element = new InputElement(input)
          break
        case 'text':
          element = new TextareaElement(input)
          break
        case 'categorical':
          element = new SelectElement(input)
          break
        case 'file':
          element = new FileElement(input)
          break
      }
      // Add onchange listener to original input element if model has autorun flag
      if (this.schema.model.autorun) {
        element.inputElement.onchange = () => {
          this.run()
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
    if (this.schema.model.type === 'py') {
      // Add loading indicator
      var overlay = document.createElement('div')
      overlay.id = 'overlay'
      overlay.className = 'valign-wrapper'
      overlay.innerHTML = `
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
      this.inputsContainer.appendChild(overlay)

      let script = document.createElement('script')
      script.src = 'https://pyodide.cdn.iodide.io/pyodide.js'
      script.onload = () => {
        window['M'].toast({html: 'Loaded: Main framework'})
        window['languagePluginLoader'].then(() => {
          fetch(this.schema.model.url)
            .then(res => res.text())
            .then(res => {
              console.log('[Port] Loaded python code:', res)
              this.pymodel = res
              // Here we filter only import part to know load python libs
              let imports = res.split('\n').filter(str => (str.includes('import')) && !(str.includes(' js '))).join('\n')
              console.log('Imports: ', imports)
              window['pyodide'].runPythonAsync(imports, () => {})
                .then((res) => {
                  window['M'].toast({html: 'Loaded: Libs'})
                  this.inputsContainer.removeChild(overlay)
                })
                .catch((err) => {
                  console.log(err)
                  window['M'].toast({html: 'Error loading libs'})
                  this.inputsContainer.removeChild(overlay)
                })
            })
            .catch((err) => {
              console.log(err)
              window['M'].toast({html: 'Error loading python code'})
              this.inputsContainer.removeChild(overlay)
            })
        })
      }
      document.head.appendChild(script)
    } else if (['function', 'class', 'async-init', 'async-function'].includes(this.schema.model.type)) {
      // Initialize worker with the model
      this.worker = new Worker('dist/worker.js')
      this.worker.postMessage(this.schema.model)
      this.worker.onmessage = (e) => {
        const data = e.data
        console.log('[Port] Response from worker:', data)
        if ((typeof data === 'object') && (data._status)) {
          switch (data._status) {
            case 'loaded':
              window['M'].toast({html: 'Model and libs loaded'})
              this.inputsContainer.removeChild(overlay)
              break
          }
        } else {
          this.output(data)
        }
      }
      this.worker.onerror = () => {
        console.log('[Port] Error from worker')
      }
    } else if (this.schema.model.type === 'tf') {
      // Initialize TF
      let script = document.createElement('script')
      script.src = 'dist/tf.min.js'
      script.onload = () => {
        console.log('[Port] Loaded TF.js')
        window['tf'].loadLayersModel(this.schema.model.url).then(res => {
          console.log('[Port] Loaded Tensorflow model')
        })
      }
      document.head.appendChild(script)
    }
  }

  run () {
    const schema = this.schema
    console.log('[Port] Running the model')
    let inputValues
    if (schema.model && schema.model.container && schema.model.container === 'object') {
      inputValues = {}
      schema.inputs.forEach(input => {
        inputValues[input.name] = input.element.getValue()
      })
    } else {
      inputValues = schema.inputs.map(input => {
        return input.element.getValue()
      })
    }
    // We have all input values pass them to worker or tf
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
        this.worker.postMessage(inputValues)
        break
      case 'api':
        break
    }
  }

  _showOutput (value, output) {
    console.log('[Port] Show output: ', value, output)
    switch (output.type) {
      case 'file':
        let fileBlob = new Blob([value], {type: 'text/plain;charset=utf-8'})
        let a = document.createElement('a')
        a.className = 'waves-effect waves-light btn'
        a.innerText = 'Download'
        a.onclick = () => {
          FileSaver.saveAs(fileBlob, output.filename || 'output')
        }
        this.outputsContainer.appendChild(a)
        break
      case 'svg':
        // Append svg element
        let svgContainer = document.createElement('div')
        svgContainer.innerHTML = value
        this.outputsContainer.appendChild(svgContainer)

        // Append download button
        let svgBlob = new Blob([value], {type: 'text/plain;charset=utf-8'})
        let svgDownloadButton = document.createElement('a')
        svgDownloadButton.className = 'waves-effect waves-light btn'
        svgDownloadButton.innerText = 'Download'
        svgDownloadButton.onclick = () => {
          FileSaver.saveAs(svgBlob, 'code.svg')
        }
        this.outputsContainer.appendChild(svgDownloadButton)
        break
      default:
        let collection = document.createElement('ul')
        collection.className = 'collection'

        let collectionItem = document.createElement('li')
        collectionItem.className = 'collection-item'
        collectionItem.innerText = value
        collection.appendChild(collectionItem)

        if (output.name && output.name.length) {
          let spanElement = document.createElement('span')
          spanElement.className = 'badge'
          spanElement.innerText = output.name
          collectionItem.appendChild(spanElement)
        }

        this.outputsContainer.appendChild(collection)
    }
  }

  output (data) {
    // const blob = new Blob([file], { type: type || 'application/*' });
    // const file = window.URL.createObjectURL(blob)
    console.log('[Port] Got results from worker', typeof data)

    this.outputsContainer.innerHTML = ''

    if (this.schema.outputs && this.schema.outputs.length) {
      if (Array.isArray(data)) {
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
        this.schema.outputs.forEach((output, i) => {
          if (output.name && data[output.name]) {
            this._showOutput(data[output.name], output)
          } else {
            this._showOutput(data[Object.keys(data)[i]], output)
          }
        })
      } else {
        this._showOutput(data, this.schema.outputs[0])
      }
    } else {
      // Output raw object
      let pre = document.createElement('pre')
      pre.innerText = JSON.stringify(data, null, 2)
      this.outputsContainer.appendChild(pre)
    }
  }
}

module.exports = Port
