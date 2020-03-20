const parseCSV = require('csv-parse/lib/sync')
const FileReader = window['FileReader']

class InputElement {
  constructor (input) {
    let name = input.name || 'Input'
    let wrapper = document.createElement('div')
    wrapper.className = 'input-field'

    let inputElement = document.createElement('input')
    inputElement.id = name

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

class RangeElement {
  constructor (input) {
    let name = input.name || 'Input'
    let wrapper = document.createElement('div')
    wrapper.className = 'range-field'

    let inputElement = document.createElement('input')
    inputElement.id = name
    inputElement.type = 'range'
    inputElement.min = input.min || 0
    inputElement.max = input.max || 100

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
    return parseInt(this.inputElement.value)
  }
}

class CheckboxElement {
  constructor (input) {
    let name = input.name || 'Input'

    let wrapper = document.createElement('div')
    let labelElement = document.createElement('label')

    let inputElement = document.createElement('input')
    inputElement.id = name
    inputElement.type = 'checkbox'
    inputElement.className = 'filled-in'

    let spanElement = document.createElement('span')
    spanElement.innerText = input.name

    labelElement.appendChild(inputElement)
    labelElement.appendChild(spanElement)

    wrapper.appendChild(labelElement)

    this.type = input.type
    this.inputElement = inputElement
    this.element = wrapper
  }

  getValue () {
    return this.inputElement.checked
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
    textareaElement.id = name

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
    selectElement.id = name

    if (input.values && input.values.length) {
      input.values.forEach((val, i) => {
        let optionElement = document.createElement('option')
        optionElement.value = i
        optionElement.innerText = val
        selectElement.appendChild(optionElement)
      })
    }

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
      console.log('[File input] Change event')
      const reader = new FileReader()
      this.file = e.target.files[0]
      window['readertmp'] = reader
      reader.readAsText(this.file)
      reader.onload = () => {
        this.value = reader.result
        if (typeof this.cb !== 'undefined') {
          this.cb.run()
        }
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

class ImageElement {
  constructor (input) {
    console.log('[Port] Input object: ', input)

    this.value = null
    this.file = null
    this.width = input.width || 300
    this.height = input.height || 300

    let wrapper = document.createElement('div')
    wrapper.className = 'file-field input-field'

    let canvas = document.createElement('canvas')
    canvas.width = '' + this.width
    canvas.height = '' + this.height
    wrapper.appendChild(canvas)
    this.canvas = canvas

    let context = canvas.getContext('2d')
    let img = new window['Image']()
    this.context = context

    let btnElement = document.createElement('div')
    btnElement.className = 'btn'

    let spanElement = document.createElement('span')
    spanElement.innerText = 'File'
    btnElement.appendChild(spanElement)

    let inputElement = document.createElement('input')
    inputElement.type = 'file'
    inputElement.addEventListener('change', (e) => {
      console.log('[Image input] Change event')
      const reader = new FileReader()
      this.file = e.target.files[0]
      reader.readAsDataURL(this.file)
      reader.onload = (evt) => {
        if (evt.target.readyState === FileReader.DONE) {
          img.src = evt.target.result
          img.onload = () => {
            context.clearRect(0, 0, this.width, this.height)
            context.drawImage(img, 0, 0, this.width, this.height * img.height / img.width)
            if (typeof this.cb !== 'undefined') {
              this.cb.run()
            }
          }
        }
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
    return this.context.getImageData(0, 0, this.width, this.height)
    // return this.canvas
  }
}

module.exports = {
  InputElement,
  CheckboxElement,
  RangeElement,
  TextareaElement,
  SelectElement,
  FileElement,
  ImageElement
}
