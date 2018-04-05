
/**
 * class for a simple slider
*/
class SliderBase {
  /**
  * constructor
  * @param {string} targetId html id
  * @param {array} dimensions width & height in pixels
  * @param {array} margin margin widht and height
  * @param {array} valueScale range of the value
  */
  constructor(targetId, dimensions, margin, valueScale) {
    this.target = targetId;
    this.w = dimensions[0];
    this.h = dimensions[1];
    this.m_w = margin[0];
    this.m_h = margin[1];
    this.updateCallbacks = [];

    this.value = 0;
    this.label_x_offset = 15;

    // only for internal drawing purposes!!!
    this.rangeScale = d3.scaleLinear()
      .domain([0, 100])
      .range([this.h - 2 * this.m_h, 0])
      .clamp(true);

    //
    this.valueScale = d3.scaleLinear()
      .domain([0, 100])
      .range(valueScale)
      .clamp(true);
  }

  /**
   * returns current value
   */
  get Value() {
    return this.valueScale(this.value);
  }

  /**
   * sets value, callbacks are executed
   * @param {number} v new value
   */
  set Value(v) {
    this.value = v;

    this.update();
  }

  /**
   * sets value, callbacks are not executed
   * @param {number} v new value
   */
  setValueNoCallbacks(v) {
    this.value = this.valueScale.invert(v);
    this.update(true);
  }

  /**
   * adds a callback for value change events
   * @param {fct} c callback function
   */
  addCallback(c) {
    this.updateCallbacks.push(c);
  }

  /**
   * redraws the labels
   */
  updateLabels() {
    // set labels
    this.label.attr(
      'transform',
      'translate(10,' + (this.rangeScale(this.value) + 10) + ')');
    this.label_text.text(Math.round(this.value) + '%');
  }

  /**
   * updates the slider
   * @param {bool} noCallbacks
   */
  update(noCallbacks) {
    // set kubbels
    this.kubbel.attr('cy', this.rangeScale(this.value));

    this.updateLabels();

    if (noCallbacks !== true) {
      let newZoomValue = this.valueScale(this.value);
      this.updateCallbacks.forEach(function(v) {
        v(newZoomValue);
      });
    }
  }

  /**
   * sets the render location
   * @param {string} divContId
   */
  setContainer(divContId) {
    this.target = divContId;
  }

  /** */
  initialize() {
    let svg = d3.select(this.target)
      .append('svg')
      .attr('width', this.w)
      .attr('height', this.h);

    let canvas = svg.append('g')
      .attr('transform', 'translate(' + this.m_w + ',' + this.m_h + ')')
      ;

    canvas.append('rect')
      .attr('x', this.m_w)
      .attr('y', 0)
      .attr('width', 1)
      .attr('height', this.h - this.m_h * 2)
      .attr('class', 'slider-bar')
      ;

    let self = this;
    this.kubbel = canvas.append('circle')
      .attr('cy', this.rangeScale(0))
      .attr('cx', this.m_w)
      .attr('r', 5)
      .attr('class', 'slider-knob')
      .call(d3.drag().on('start drag', function() {
        self.value = self.rangeScale.invert(d3.event.y);
        self.update();
      }))
      ;


    this.label = canvas.append('g')
      .attr('transform', 'translate( ' + self.label_x_offset + ',' + 0 + ')');

    this.label_text = this.label
      .append('text')
      .text('asdf');

    this.updateLabels();
  }
}

/**
 * class for a range slider
*/
class Slider {
    /**
  * constructor
  * @param {string} targetId html id
  * @param {array} dimensions width & height in pixels
  * @param {array} margin margin widht and height
  * @param {array} valueScale range of the value
  */
  constructor(targetId, dimensions, margin, valueScale) {
    this.target = targetId;
    this.w = dimensions[0];
    this.h = dimensions[1];
    this.m_w = margin[0];
    this.m_h = margin[1];
    this.updateCallbacks = [];

    this.value_lower = 0;
    this.value_upper = 100;
    this.label_x_offset = 15;

    // only for internal drawing purposes!!!
    this.rangeScale = d3.scaleLinear()
      .domain([0, 100])
      .range([this.h - 2 * this.m_h, 0])
      .clamp(true);

    //
    this.valueScale = d3.scaleLinear()
      .domain([0, 100])
      .range(valueScale)
      .clamp(true);
  }


  /**
   * returns current value
   */
  get Value() {
    return [this.valueScale(this.value_lower),
            this.valueScale(this.value_upper)];
  }

  /**
   * gets the upper value
   * @return {number} value
   */
  get RawValueUpper() {
    return this.value_upper;
  }

  /**
   * gets the upper value
   * @return {number} value
   */
  get RawValueLower() {
    return this.value_lower;
  }

  /**
   * sets value, callbacks are executed
   * @param {number} v new value
   */
  set Value(v) {
    // this.value = v;

    this.value_lower = this.valueScale.invert(v[0]);
    this.value_upper = this.valueScale.invert(v[1]);
    this.update();
  }

    /**
   * adds a callback for value change events
   * @param {fct} c callback function
   */
  addCallback(c) {
    this.updateCallbacks.push(c);
  }

  /**
   * redraws the labels
   */
  updateLabels() {
    // set labels
    this.label_lower.attr(
      'transform',
      'translate(10,' + (this.rangeScale(this.value_lower) + 10) + ')');

    this.label_lower_text.text(
      Math.round(this.valueScale(this.value_lower)) + ' m');

    this.label_upper.attr(
      'transform',
      'translate(10,' + (this.rangeScale(this.value_upper) - 5) + ')');

    this.label_upper_text.text(
      Math.round(this.valueScale(this.value_upper)) + ' m');
  }

  /**
   * updates and redraws the slider
  */
  update() {
    let eleValueLower = this.valueScale(this.value_lower);
    let eleValueUpper = this.valueScale(this.value_upper);

    // set kubbels
    this.kubbel_lower.attr('cy', this.rangeScale(this.value_lower));
    this.kubbel_upper.attr('cy', this.rangeScale(this.value_upper));

    this.updateLabels();

    this.updateCallbacks.forEach(function(v) {
      v([eleValueLower, eleValueUpper]);
    });
  }

  /**
   * sets the render location
   * @param {string} divContId
   */
  setContainer(divContId) {
    this.target = divContId;
  }

  /** */
  initialize() {
    let svg = d3.select(this.target)
      .append('svg')
      .attr('width', this.w)
      .attr('height', this.h);

    let canvas = svg.append('g')
      .attr('transform', 'translate(' + this.m_w + ',' + this.m_h + ')')
      ;

    canvas.append('rect')
      .attr('x', this.m_w)
      .attr('y', 0)
      .attr('width', 1)
      .attr('height', this.h - this.m_h * 2)
      .attr('class', 'slider-bar')
      ;

    let self = this;
    this.kubbel_lower = canvas.append('circle')
      .attr('cy', this.rangeScale(0))
      .attr('cx', this.m_w)
      .attr('r', 5)
      .attr('class', 'slider-knob')
      .call(d3.drag().on('start drag', function() {
        self.value_lower = self.rangeScale.invert(d3.event.y);
        if (self.value_lower > self.value_upper) {
          self.value_lower = self.value_upper;
        }
        self.update();
      }))
      ;


    this.kubbel_upper = canvas.append('circle')
      .attr('cy', this.rangeScale(100))
      .attr('cx', this.m_w)
      .attr('r', 5)
      .attr('class', 'slider-knob')
      .call(d3.drag().on('start drag', function() {
        self.value_upper = self.rangeScale.invert(d3.event.y);

        if (self.value_upper < self.value_lower) {
          self.value_upper = self.value_lower;
        }

        self.update();
      }))
      ;

    this.label_lower = canvas.append('g')
      .attr('transform', 'translate( ' + self.label_x_offset + ',' + 0 + ')');

    this.label_lower_text = this.label_lower
      .append('text')
      .text('asdf');

    this.label_upper = canvas.append('g')
      .attr('transform', 'translate( ' + self.label_x_offset + ',' + 0 + ')');

    this.label_upper_text = this.label_upper
      .append('text')
      .text('asdf');

    this.updateLabels();
  }
}

