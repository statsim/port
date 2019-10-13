module.exports = {
  // MIRROR (DEFAULT)
  'blocks':
`<div class="port-app">
  <div class="navbar-fixed">
    <nav class="white z-depth-0">
      <div class="nav-wrapper">
        <div class="container">
          <a class="logo black-text">port:</a>
          <ul class="right">
            <li><a class="waves-effect waves-light btn white black-text bordered" id="run"><span>▸</span>&nbsp;&nbsp;Run</a></li>
          </ul>
        </div>
      </div>
    </nav>
  </div>
  <div class="container" style="margin-top: 20px;">
    <div class="row">
      <div class="col s12" id="model"></div>
      <div class="col s12 m6">
        <h6>Inputs</h6>
        <div class="card bordered">
          <div class="card-content" id="inputs"></div>
        </div>
      </div>
      <div class="col s12 m6">
        <h6>Outputs</h6>
        <div class="card bordered">
          <div class="card-content" id="outputs"></div>
        </div>
      </div>
    </div>
  </div>
</div>`,

  // SIDEBAR
  'sidebar':
`<div class="port-app">
  <div class="navbar-fixed">
    <nav class="white z-depth-0">
      <div class="nav-wrapper">
        <a class="logo black-text">port:</a>
        <ul class="right">
          <li><a class="waves-effect waves-light btn white black-text bordered" id="run"><span>▸</span>&nbsp;&nbsp;Run</a></li>
        </ul>
      </div>
    </nav>
  </div>
  <div class="row">
    <div class="col s12 m3">
      <div id="model"></div>
      <div id="inputs"></div>
    </div>
    <div class="col s12 m9">
      <div id="outputs"></div>
    </div>
  </div>
</div>`
}
