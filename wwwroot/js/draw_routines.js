

// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// peak event handler

/**
 * eventhandlere for mouseout events of peaks
 * @param {object} d data
 */
function peakMouseout(d) {
  d3.select(this).attr('r', 4 / zoomLevel);

  putPeakToForeground(d3.selectAll('.peak-lower'));

  hideTooltip();
}


let peakToBackgroundTransition = d3.transition()
  .delay(500)
  .duration(2500)
  .ease(d3.easeLinear);

/**
 * put peaks to background by setting the opacity
 * @param {array} peakSelection
 * @return {array} peakSelection
 */
function putPeakToBackground(peakSelection) {
  let sel = peakSelection
    .transition(peakToBackgroundTransition)
    .style('opacity', 0.2)
    .attr('class', 'peak-lower');

  return sel;
}

/**
 * put peaks to foreground by setting the opacity
 * @param {array} peakSelection
 * @return {array} peakSelection
 */
function putPeakToForeground(peakSelection) {
  let sel = peakSelection
    .transition(peakToBackgroundTransition)
    .style('opacity', 1)
    .attr('class', 'peak');

  return sel;
}

/**
 * eventhandler for mouseover of peaks
 * @param {object} peak
 */
function peakMouseover(peak) {
  d3.select(this)
    .attr('r', 5.0 / zoomLevel)
    .attr('transform', function(d) {
      let pos = projection([d.pos[1], d.pos[0]]);
      return 'translate(' + pos[0] + ',' + pos[1]
        + ') scale(' + 1 / zoomLevel + ')';
    })
    ;

  showTooltip(peak.name + ' (' + peak.ele + ')',
    d3.event.pageX + 10,
    d3.event.pageY - 35);

  // put lower peaks to background
  let sel = d3.selectAll('.peak')
    .filter(function(p) {
      return peak.ele > p.ele;
    });

  sel = putPeakToBackground(sel);

  // circle to nearest aerialway

  let peakPosLat = peak.pos[0];
  let peakPosLon = peak.pos[1];

  circleToNearestAerialway(peakPosLon, peakPosLat);
}

/**
 * eventhanlder for clicks on peaks
 * @param {object} clickedPeak
 * @param {index} i (unuesed)
 */
function peakClick(clickedPeak, i) {
  let peakPosLat = clickedPeak.pos[0];
  let peakPosLon = clickedPeak.pos[1];

  circleToNearestAerialway(peakPosLon, peakPosLat);
}

/**
 * draws the shape of a peak
 * @param {object} d peak data
 * @return {d3.path} peak path
 */
function peakPathDrawing(d) {
  let p = d3.path();
  let scale = 5.0;

  p.moveTo(+ 0, - scale);
  p.lineTo(- scale, + scale / 2);
  p.lineTo(+ scale, + scale / 2);
  p.lineTo(+ 0, - scale);

  return p;
}

// //////////////////////////////////////////////////////////////////////
// //////////////////////////////////////////////////////////////////////
// aerialway stuff

/**
 * mouseover handler of aerialway
 * @param {object} d aerialway data
 */
function aerialwayMouseover(d) {
  d3.select(this).attr('class', 'aerialway-hi');

  showTooltip(d.name,
    d3.event.pageX + 10,
    d3.event.pageY - 35);
}

/**
 * mouse out event handler of aerialways
 */
function aerialwayMouseout() {
  d3.select(this).attr('class', 'aerialway');
  hideTooltip();
}

/**
 * click handler for aerialways
 * @param {object} d aerialway data
 */
function aerialwayClick(d) {
  let aerialwayPosLat = d.path_data.coordinates.last()[1];
  let aerialwayPosLon = d.path_data.coordinates.last()[0];

  let distances = visiblePeaks.map(
    function(p, i) {
      let dist = getDistanceFromLatLonInKm(
        aerialwayPosLat,
        aerialwayPosLon,
        p.pos[0],
        p.pos[1]);
      return [dist, i];
    });

  distances = distances.sort(function(l, r) {
    return l[0] - r[0];
  });
  let nearestPeak = visiblePeaks[distances[0][1]];
  let distanceToNearestPeak = distances[0][0];

  drawNearestPointCircle(
    [aerialwayPosLon, aerialwayPosLat],
    [nearestPeak.pos[1], nearestPeak.pos[0]],
    distanceToNearestPeak);
}


