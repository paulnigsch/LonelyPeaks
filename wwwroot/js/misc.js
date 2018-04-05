/**
 * calculates the distance between two coordinates
 * @param {float} lat1
 * @param {float} lon1
 * @param {float} lat2
 * @param {float} lon2
 * @return {float} distance in km
 */
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  let R = 6371; // Radius of the earth in km
  let dLat = deg2rad(lat2 - lat1); // deg2rad below
  let dLon = deg2rad(lon2 - lon1);
  let a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  let d = R * c; // Distance in km
  return d;
}

/**
 * converts degree to radians
 * @param {float} deg (0-360)
 * @return {float} radians value [0-2 Pi]
 */
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * calculates the distance between two points
 * in the euclidean plane
 * @param {array} a point1
 * @param {array} b point2
 * @return {float} distance
 */
function euclDist(a, b) {
  if (b === undefined) {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
  }
  return euclDist([a[0] - b[0], a[1] - b[1]]);
}

/**
 * cacluate the reverse angle between two points in the
 * euclidean plane
 * @param {array} a point 1
 * @param {array} b point 2
 * @return {float} angle
 */
function calculateAngleYRev(a, b) {
  let x = [b[0] - a[0], b[1] - a[1]];
  let y = [1, 0];

  let tmp = (x[0] * y[0] + x[1] * y[1]) / (euclDist(x) * euclDist(y));

  if (x[1] < 0) {
    return 2 * Math.PI - Math.acos(tmp);
  }

  return Math.acos(tmp);
}

/**
 * adds the memeber last() to the Array type
 * @return {object} last element of Array
 */
if (!Array.prototype.last) {
  Array.prototype.last = function() {
    return this[this.length - 1];
  };
};

/**
 * // check whether pt is left of/right of/or on the line g1-g2
 * 0 ... on the line
 * >0 ... left
 *  <0 .. right
 * @param {array} pt point in the eclidean plane
 * @param {array} g1 point in the eclidean plane
 * @param {array} g2 point in the eclidean plane
 * @return {int} 0 .. on line; > 0 left; < 0 right
 */
function locationRelativeTo(pt, g1, g2) {
  return det3([g1[0], g1[1], 1],
    [g2[0], g2[1], 1],
    [pt[0], pt[1], 1]
  );
}


/**
 * checks whether pt is inside the polygon,
 * @param {array} pt point in the eclidean plane
 * @param {array} polygon list of polygon points
 * @return {bool} true if inside of the polygon
 */
function isInsidePolyon(pt, polygon) {
  let CorrectSign = null;
  for (let i = 0; i < polygon.length - 1; i = i + 1) {
    let curSign = Math.sign(locationRelativeTo(pt, polygon[i], polygon[i + 1]));
    if (CorrectSign === null && curSign !== 0) {
      CorrectSign = curSign;
      continue;
    }

    if (curSign !== CorrectSign) {
      return false;
    }
  }
  // check line between last and first point
  let curSign = Math.sign(locationRelativeTo(pt, polygon.last(), polygon[0]));
  if (curSign !== CorrectSign) {
    return false;
  }

  return true;
}
