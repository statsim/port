module.exports = {
  // MIRROR (DEFAULT)
  'blocks':
`<div class="port-app">
  <div class="row">
    <div class="col s12" id="model"></div>
    <div class="col s12 m6">
      <!-- <h6>Inputs</h6> -->
      <div class="card bordered">
        <div class="card-content" id="inputs"></div>
        <a class="waves-effect waves-light btn" id="run" style="width:100%"><span>▸</span>&nbsp;&nbsp;Run</a>
      </div>
    </div>
    <div class="col s12 m6">
      <!-- <h6>Outputs</h6> -->
      <div class="card bordered">
        <div class="card-content" id="outputs"></div>
      </div>
    </div>
  </div>
</div>`,

  // SIDEBAR
  'sidebar':
`<div class="port-app">
  <div class="row">
    <div class="col s12 m3 port-sidebar">
      <div id="model"></div>
      <div id="inputs"></div>
      <a class="waves-effect waves-light btn" id="run"><span>▸</span>&nbsp;&nbsp;Run</a>
    </div>
    <div class="col s12 m9">
      <div id="outputs"></div>
    </div>
  </div>
</div>`
}
