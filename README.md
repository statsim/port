### Config/schema object

- `model` - Contains main parameters of the model/script
  - `url` (string) - URL of a JS/Python file to load, or:
  - `code` (function) - It's possible to pass code to a Port object instead of an url
  - `name` (string) - Name of the callable object. Default value is taken from `url` or `code`
  - `autorun` (boolean, default - `false`) - Defines if the script should be evaluated on each input change
  - `type` (string) - What kind of script is loaded. Influences how the code is initializated. Possible values: 
    - `function` (default)
    - `class` 
    - `async-function`
    - `async-init`
    - `py`
    - `tf`
  - `method` (string) - If `type` is `class`, defines the name of the class method to call during evaluation
  - `container` (string) - How input values are passed to the function/method:
    - `object` (default) - Pass inputs wrapped in an object, i.e. `{'x': 1, 'y': 2}`
    - `args` - Pass inputs as separate arguments
  - `worker` (boolean) - If `true` the script will be run in a Web Worker




