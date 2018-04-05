
// global vars
'use strict';

let peakData;
let aerialwayData;
let tooltipDiv;
let zoomLevel = 1;
let d3Zoom = null;
let aerialwayCircle;
let vlbgData;
let selectedCommunity;
let communityBorderData;
let altitudeSlider;

let visiblePeaks;

let margin = 5;
let width = 650 - margin;
let height = 650 - margin;

let boundingBoxVlbg =
  {
    type: 'LineString',
    coordinates: [
      [10.2371623, 47.5961014],
      [9.5307487, 47.5961014],
      [9.5307487, 46.8408621],
      [10.2371623, 46.8408621],
    ],
  };

// d3.projections are in long/lat
// longitude (ostwest)/latitude(nord sued)
let projection = d3.geoMercator()
  .rotate([0, 0, 0])
  .fitExtent([[0, 0], [width, height]], boundingBoxVlbg);

let path = d3.geoPath(projection);

// / animation stuff
let peakInitDelayFactor = 300;
let peakInitDurationFactor = 1000;

// ////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////
// ////////////////////////////////////////////////////////////////////////////

/**
 * initial peak animation
*/
function initPeaks() {
  visiblePeaks = peakData;

  let map = d3.selectAll('.peak-cont')
    .selectAll('path')
    .data(peakData, function(d) {
      return d._id;
    });


  // enter
  map.enter()
    .append('path')
    .attr('d', peakPathDrawing)
    .attr('transform', function(d) {
      let pos = projection([d.pos[1], d.pos[0]]);
      return 'translate(' + pos[0] + ',' + pos[1] + ')';
    })
    .attr('class', 'peak')
    .on('mouseover', peakMouseover)
    .on('mouseout', peakMouseout)
    .on('click', peakClick)
    .style('opacity', 0);


  let n = 0;
  d3.selectAll('.peak-cont').selectAll('path')
    .transition()
    .duration(function(d, i) {
      return peakInitDurationFactor * 1 / Math.sqrt(i + 1);
    }) // +1 to avoid 0
    .delay(function(d, i) {
      return Math.sqrt(i) * peakInitDelayFactor;
    })
    .ease(d3.easeLinear)
    .on('start', function() {
      ++n;
    })
    .on('end', function() {
      --n; if (n === 0) {
        initAerialways();
      }
    })
    .style('opacity', 1)
    .style('opacity', null); // remove opacity style. This allows us to
  // control opacity via css
  // initAerialways();
}

// ///////////////////////////
// update peaks

/**
 * redraw the visible peaks
 * @param {number} heightThreshold min altitude value for visible peaks
 * @param {number} heightUpperThreshold max altitude value for visible peaks
 */
function updatePeaks(heightThreshold, heightUpperThreshold) {
  if (heightUpperThreshold === undefined) {
    heightUpperThreshold = 9000; // 9000 > Mt. Everst
  }

  // if zoomed
  // fixing peak symbol sizes
  if (heightThreshold === undefined) {
    d3.selectAll('.peak-cont')
      .selectAll('path')
      .attr('transform', function(d) {
        // debugger;
        let pos = projection([d.pos[1], d.pos[0]]);
        return 'translate(' + pos[0] + ',' + pos[1]
          + ') scale(' + 1 / zoomLevel + ')';
      })
      ;
    return;
  }

  // filtering peaks
  heightThreshold = Math.round(heightThreshold);
  heightUpperThreshold = Math.round(heightUpperThreshold);

  let dataFiltered = peakData.filter(function(v) {
    return heightThreshold <= v.ele && v.ele <= heightUpperThreshold;
  });
  visiblePeaks = dataFiltered;
  let map = d3.selectAll('.peak-cont')
    .selectAll('path')
    .data(dataFiltered, function(d) {
      return d._id;
    });


  // enter
  map.enter()
    .append('path')
    .attr('d', peakPathDrawing)
    .attr('transform', function(d) {
      let pos = projection([d.pos[1], d.pos[0]]);
      return 'translate(' + pos[0] + ',' + pos[1] + ')';
    })
    .attr('class', 'peak')
    .on('mouseover', peakMouseover)
    .on('mouseout', peakMouseout)
    .on('click', peakClick);

  // exit
  map.exit()
    .transition()
    .duration(1000)
    .delay(200)
    .style('opacity', 0)
    .remove();
}


/**
 * draws the community border
 * @param {object} geoDataRaw data of community borders
 */
function drawCommunityBorders(geoDataRaw) {
  communityBorderData = geoDataRaw.map(function(d, i) {
    d.path_data =
      {
        'type': 'LineString',
        'coordinates': d.border.map(function(coords) {
          return [coords[1], coords[0]];
        }),
      };
    return d;
  });

  // draw community borders
  let map = d3.selectAll('.map-cont')
    .selectAll('path')
    .data(communityBorderData)
    .enter()
    .append('path')
    .attr('d', function(d) {
      return path(d.path_data);
    })
    .attr('class', function(d) {
      return d.name + ' community';
    })
    .on('mouseover', function(d, index, data) {
      // d3.select(this).style('fill', 'black');

      d3.select(this)
        .attr('class', ' community-selected');

      showTooltip(d.name, d3.event.pageX + 10, d3.event.pageY - 35);
    })
    .on('mouseout', function(community, index, data) {
      // d3.select(this).style('fill', null);

      d3.select(this)
        .attr('class', community.name + ' community');

      hideTooltip();
    })
    .on('click', function(community, index, data) {
      if (selectedCommunity === community) {
        // put all peaks to foreground
        putPeakToForeground(d3.selectAll('.peak-lower'));

        selectedCommunity = null;
      } else {
        let sel = d3.selectAll('.peak-lower')
          .filter(function(p) {
            return d3.polygonContains(community.border, p.pos) === true;
          });
        putPeakToForeground(sel);

        sel = d3.selectAll('.peak')
          .filter(function(p) {
            return d3.polygonContains(community.border, p.pos) === false;
          });
        putPeakToBackground(sel);

        selectedCommunity = community;
      }
    }) // .on(click)
    ;
}


/**
 * draw the border of vorarlberg
 * @param {error} e  ajax error message
 * @param {object} d border data
 */
function drawVlbg(e, d) {
  if (e !== null) {
    console.error(e);
    return;
  }

  vlbgData = d;

  // TODO: use correct data
  let vlbPath = [{
    type: 'LineString',
    coordinates: d[0].border.map(function(coords) {
      return [coords[1], coords[0]];
    }),
  }];

  let map = d3.selectAll('.map-vlbg')
    .selectAll('path')
    .data(vlbPath)
    .enter()
    .append('path')
    .attr('d', function(d) {
      return path(d);
    })
    .attr('class', 'vlbg');
}

/**
 * draws the peaks
 * @param {error} e  ajax error message
 * @param {*} d peak data
 */
function drawPeaks(e, d) {
  if (e !== null) {
    console.error(e);
    return;
  }

  // filter peaks
  peakData = d;


  // updatePeaks(0);
  initPeaks();
}

/**
 * draws the line and circle between peak and nearest aerialway
 * @param {number} startLon
 * @param {number} startLat
 */
function circleToNearestAerialway(startLon, startLat) {
  let distances = aerialwayData.map(
    function(p, i) {
      let pos = p.path_data.coordinates.last();

      let dist = getDistanceFromLatLonInKm(
        startLat,
        startLon,
        pos[1], // lat in aerialway data
        pos[0]); // lon in aerialway data
      return [dist, i];
    });

  distances = distances.sort(function(l, r) {
    return l[0] - r[0];
  });
  let nearestAerialway = aerialwayData[distances[0][1]];
  let nearestPos = nearestAerialway.path_data.coordinates.last();

  let distanceToNearest = distances[0][0];

  drawNearestPointCircle(
    [startLon, startLat],
    nearestPos,
    distanceToNearest);
}

/**
 * auxiliary function of circleToNearestAerialway,
 * contains the drawing logic
 * @param {array} aerialwayPos position of aerialway (lon/lat format!!!)
 * @param {array} peakPos position of peak (lon/lat format!!!)
 * @param {number} distance radius
 */
function drawNearestPointCircle(aerialwayPos, peakPos, distance) {
  let aerialwayCanvas = projection(aerialwayPos);
  let peakCanvas = projection(peakPos);

  let aerialwayCenter = aerialwayCircle.selectAll('path')
    .data([{
      'r': euclDist(aerialwayCanvas, peakCanvas),
      'cx': aerialwayCanvas[0],
      'cy': aerialwayCanvas[1],
      'angle': calculateAngleYRev(aerialwayCanvas, peakCanvas),
    }], function(d) {
      return Math.random();
    }); // update always!


  aerialwayCenter.enter()
    .append('path')
    .attr('d', function(d) {
      let p = d3.path();
      p.moveTo(d.cx, d.cy);
      p.arc(d.cx, d.cy, d.r, d.angle, d.angle + 2 * Math.PI);

      return p;
    });

  aerialwayCenter.exit().remove();

  let aerialwayCenterText = aerialwayCircle.selectAll('text')
    .data([{
      'r': euclDist(aerialwayCanvas, peakCanvas),
      'cx': aerialwayCanvas[0],
      'cy': aerialwayCanvas[1],
      'angle': calculateAngleYRev(aerialwayCanvas, peakCanvas),
      'distance': distance,
    }], function(d) {
      return Math.random();
    }); // update always!

  aerialwayCenterText.enter()
    .append('text')
    .attr('x', function(d) {
      return d.cx + 10 / zoomLevel;
    })
    .attr('y', function(d) {
      return d.cy - 10 / zoomLevel;
    })
    .text(function(d) {
      return Math.round(d.distance * 10) / 10 + ' km';
    })
    .style('font-size', function(d) {
      return 20.0 / zoomLevel + 'px';
    })
    // .style("font-size" , "10px")
    .attr('class', 'circle-text');

  aerialwayCenterText.exit().remove();
}


// if true the zoom event handler updates the slider values
// for preventing recursions since an update of the slider values
// itself would tirgger zoom event
let updateSliderOnZoom = false;

/**
 * for manually setting the zoom level,
 * used in the callback of the sliders
 * @param {number} newZoomLevel
 */
function manualZoom(newZoomLevel) {
  zoomLevel = newZoomLevel;

  // d3Zoom.scaleTo emits a zoomed event,
  // therefore, the slider update is not needed
  updateSliderOnZoom = true;
  d3Zoom.scaleTo(d3.select('.drawing-area'), zoomLevel);
}

/**
 * eventhandler for zoom events
 */
function zoomed() {
  // extracting d3.event.transoform.k
  // ... this is probably rather dangerours
  zoomLevel = d3.event.transform.k;
  d3.select('.drawing-area').attr('transform', d3.event.transform);
  // debugger;
  updatePeaks();

  d3.selectAll('.aerialway').style('stroke-width', 2.0 / zoomLevel);

  // update slider only if the event if necessary
  if (updateSliderOnZoom === false) {
    zoomSlider.setValueNoCallbacks(zoomLevel);
  }
  updateSliderOnZoom = false;

  // update scale
  d3.select('.scale-drawing-area text')
      .text(scaleText);
}


/**
 * updates and shows the Tooltip
 * @param {string} innerHtml content of tooltip
 * @param {number} posLeft
 * @param {number} posRight
 */
function showTooltip(innerHtml, posLeft, posRight) {
  tooltipDiv
    .transition()
    .duration(200)
    .delay(500)
    .style('opacity', 1);

  tooltipDiv
    .style('left', posLeft + 'px')
    .style('top', posRight + 'px');

  tooltipDiv.html(innerHtml);
}

/**
 * hide tooltip window
*/
function hideTooltip() {
  tooltipDiv
    .transition()
    .duration(200)
    .style('opacity', 0);
}

/**
 * initial drawing of the aerialways data
 */
function initAerialways() {
  console.log('init aerialways');
  let aerialways = d3.selectAll('.aerialway-cont')
    .selectAll('path')
    .data(aerialwayData);

  aerialways
    .enter()
    .append('path')
    .attr('d', function(d) {
      return path(d.path_data);
    })
    .attr('class', 'aerialway')
    .on('mouseover', aerialwayMouseover)
    .on('mouseout', aerialwayMouseout)
    .on('click', aerialwayClick) // on('click',...)
    .style('opacity', 0)
    .transition()
    .duration(10000)
    .delay(1000)
    .ease(d3.easeLinear)
    .style('opacity', 1)
    .style('opacity', null); // remove opacity style.
  // This allows us to control via css
};

/**
 * initial aerialway data handling function
 * callback of d3.json
 * @param {error} err ajax error
 * @param {*} data aerialway data
 */
function loadAerialwayData(err, data) {
  if (err !== null) {
    console.error('loading aerialway data failed: ' + err);
    return;
  }

  aerialwayData = data.map(function(d) {
    d.path_data = {
      'type': 'LineString',
      'coordinates': d.nodes.map(function(coords) {
        return [coords[1], coords[0]];
      }),
    };
    return d;
  });
}

/**
 * redraw aerialways
 */
function updateAerialWays() {
  let aerialways = d3.selectAll('.aerialway-cont')
    .selectAll('path')
    .data(aerialwayData);

  aerialways
    .enter()
    .append('path')
    .attr('d', function(d) {
      return path(d.path_data);
    })
    .attr('class', 'aerialway')
    .on('mouseover', aerialwayMouseover)
    .on('mouseout', aerialwayMouseout)
    .on('click', aerialwayClick)// on('click',...)
    ;
}

/**
 * main entrypoint of the visualization
 * creates html elements and loads the visualization data
 */
function draw() {
  'use strict';

  // creating basic outline of the svg image
  let svg = d3.select('#map-container')
    .append('svg')
    .attr('width', width + margin)
    .attr('height', height + margin)
    .attr('class', 'map-area')
    ;

  d3Zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', zoomed);


  d3.selectAll('.map-area')
    .append('g')
    .attr('class', 'drawing-area')
    .call(d3Zoom)
    ;

  d3.selectAll('.map-area')
      .append('g')
      .attr('class', 'scale-drawing-area')
      .call(d3Zoom)
      .attr('transform', function(d) {
          return 'translate(10,600)';
      })
      ;

  // tiles

  var tiles = [
    [9,46 + 1],
    [9,47 + 1],
    [10,46 + 1],
    [10,47 + 1]
  ] 
  
  function tileSize( d) {
      var pt1 = projection(d);
      var pt2 = projection( [ d[0] + 1, d[1] - 1  ] );
  
      return [ Math.round( Math.abs( pt1[0] - pt2[0] )), Math.round(Math.abs( pt1[1] - pt2[1] ) )];
  }
  
    //svg.append("g")
    //d3.selectAll('.map-area')
    console.log(" initializing background contours");
    d3.selectAll('.drawing-area')
          .append("g")
          .attr('class', 'tiles-canvas')
        .selectAll("image")
        .data(tiles)
        .enter().append("image")
        .attr("xlink:href", function(d) { return "/data/LonelyPeaks/tiles/slopeshade/N" + String(( d[1]) -1  ).padStart(2,0) + "E" + String(d[0]).padStart(3,0) + ".png"; })
        .attr("width",  function(d) {return tileSize(d)[0] + "px" ; } )
        .attr("height", function(d) {return tileSize(d)[1] + "px" ; } )
        .attr("x", function(d) { return projection(d)[0]; })
        .attr("y", function(d) { return projection(d)[1] })
        .attr("preserveAspectRatio", "none")
        ;
  

  

  let mapCommunities = d3.selectAll('.drawing-area')
    .append('g')
    .attr('class', 'map-cont');
    
  let mapVlbg = d3.selectAll('.drawing-area')
      .append('g')
      .attr('class', 'map-vlbg');

  aerialwayCircle = d3.selectAll('.drawing-area')
    .append('g')
    .attr('class', 'aerialway-circle');

  aerialwayCircle
    .selectAll('path')
    .data([{
      'r': 0,
      'cx': 100,
      'cy': 100,
      'angle': 0,
    }], function(d) {
      return Math.random();
    }) // update always!
    .enter()
    .append('path')
    .attr('d', function(d) {
      let p = d3.path();
      p.moveTo(d.cx, d.cy);
      p.arc(d.cx, d.cy, d.r, d.angle, d.angle + Math.PI);
      return p;
    });

  // load data
  let peaks = d3.selectAll('.drawing-area')
    .append('g')
    .attr('class', 'peak-cont');

  let aerialwayContent = d3.selectAll('.drawing-area')
    .append('g')
    .attr('class', 'aerialway-cont');


  // ///////////////////////////
  // add tooltip
  // http://bl.ocks.org/d3noob/a22c42db65eb00d4e369

  tooltipDiv = d3.select('#app-body')
    .append('div')
    .attr('class', 'tooltip')
    ;


  // draw the elements

  drawMapScale();

  d3.json('/data/LonelyPeaks/aerialway_filtered.json', loadAerialwayData);
  d3.json('/data/LonelyPeaks/border_vlbg.json', drawVlbg);
  d3.json('/data/LonelyPeaks/peaks_filtered.json', drawPeaks);
  d3.json('/data/LonelyPeaks/border_filtered.json', drawCommunityBorders);
}

/**
 * callback for clicks on the story widget
 * advances the story to the next slide
*/
function storyCallback1() {
  let animationSemaphore = 0;

  /*
    - selcet overlay
    - fade out visible site
    - hide visible site
    - if last site -> hide overlay
    - enable next site
    */
  d3.select('#story-content-container')
    .selectAll('.story-site')
    .transition()
    .duration(10)
    .delay(10)
    .ease(d3.easeLinear)
    .style('opacity', 0)
    .on('start', function() {
      animationSemaphore++;
    })
      .on('end', function() {
        // hide currently active slide
        d3.select(this).attr('class', 'story-site hidden');

        animationSemaphore--;
        if (animationSemaphore === 0) {
          let CurSite = storySites[storySiteIndex++];

          // disable/hide the overlay if last slide
          if (CurSite === undefined) {
            d3.select('#story-content-overlay')
              .transition()
              .duration(30)
              .delay(10)
              .ease(d3.easeLinear)
              .style('background-color', '#5C5C5C00')
              .on('start', function() {
                console.log('display start ', Date.now());
              })
              .on('end', function() {
                console.log('display none', Date.now());
                d3.select(this).style('display', 'none');
              });
          }

          // fade in next site
          d3.select('#story-content-container')
            .transition()
            .duration(10)
            .delay(10)
            .ease(d3.easeLinear)
            .selectAll('#' + CurSite)
            .style('opacity', 1)
            .attr('class', 'story-site active');
        }

        // display informations
        if (storySitesActions[storySiteIndex] !== undefined) {
            storySitesActions[storySiteIndex]();
        }
    });
}

/**
 * intializ and starts the story
*/
function initStory() {
  d3.select('#story-content-container')
    .on('click', function() {
      storyCallback1();
    });

  d3.select('#help-content-overlay').style('display', 'none');
}

/** */
function reopenIntroduction() {
    d3.select('#story-content-overlay').style('display', null);
    storySiteIndex = 1;
    storyCallback1();
}

/**
 * closes the help window
*/
function closeHelp() {
  d3.select('#help-content-overlay').style('display', 'none');
}

/**
 * opens the help window
*/
function openHelp() {
  console.log('help');
  d3.select('#help-content-overlay').style('display', null);

  d3.select('#help-content-overlay')
    .on('click', function() {
      closeHelp();
    })
    ;
}

/**
 * draws the scale
 */
function drawMapScale() {
    let scaleData = {
        'x': 0,
        'y': 0,
        'length': 50,
    };

    // take two points that are 30pixel appart, project them onto
    // the map and measure their distance

    let pt1 = projection.invert([0, 0]);
    let pt2 = projection.invert([scaleData.length, 0]);

    let distanceInKm = getDistanceFromLatLonInKm(
        pt1[0], pt1[1],
        pt2[0], pt2[1],
    );

    scaleData.distance = distanceInKm;
    console.log(distanceInKm);
    scaleData = [scaleData];

    // draw a scale
    d3.select('.scale-drawing-area')
        .selectAll('path')
        .data(scaleData)
        .enter()
        .append('path')
        .attr('d', function(d) {
            let p = d3.path();
            p.moveTo(d.x, d.y - 5);
            p.lineTo(d.x, d.y);
            p.lineTo(d.x + d.length, d.y);
            p.lineTo(d.x + d.length, d.y - 5);
            return p;
        });

    // draw scale text/description
    d3.select('.scale-drawing-area')
        .selectAll('text')
        .data(scaleData)
        .enter()
        .append('text')
        .attr('x', function(d) {
            return d.x + d.length + 5;
        })
        .attr('y', function(d) {
            return d.y;
        })
        .text(scaleText)

        ;
}

/**
 * adjusts the text of the scale
 * @param {object} data
 * @return {string} string 'xxx km'
 */
function scaleText(data) {
    return Math.round(data.distance / zoomLevel * 10) / 10 + ' km';
}
