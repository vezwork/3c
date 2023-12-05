const DEFAULT_COLOR = "black";
const GRID_COLOR = "rgba(255, 0, 0, 0.2)";

function getAimingPoint() {
  const cx =
    pointPlaceDistance *
    Math.sin(camera.rot.y + Math.PI) *
    Math.sin(Math.PI / 2 + camera.rot.x);
  const cy = pointPlaceDistance * Math.cos(Math.PI / 2 + camera.rot.x);
  const cz =
    pointPlaceDistance *
    Math.cos(camera.rot.y + Math.PI) *
    Math.sin(Math.PI / 2 + camera.rot.x);

  if (gridOn) {
    return {
      x: roundToNearest(camera.position.x + cx, gridScale),
      y: roundToNearest(-camera.position.y + cy, gridScale),
      z: roundToNearest(camera.position.z + cz, gridScale),
    };
  } else {
    return {
      x: camera.position.x + cx,
      y: -camera.position.y + cy,
      z: camera.position.z + cz,
    };
  }
}

function drawGrid(point, gridSize, gridScale) {
  ctx.strokeStyle = GRID_COLOR;
  var zeroCorner = {
    x: point.x - gridSize / 2,
    y: point.y - gridSize / 2,
    z: point.z - gridSize / 2,
  };
  for (var i = 0; i < gridSize + gridScale; i += gridScale) {
    for (var k = 0; k < gridSize + gridScale; k += gridScale) {
      drawLineBetweenPoints(
        { x: zeroCorner.x + i, y: zeroCorner.y, z: zeroCorner.z + k },
        { x: zeroCorner.x + i, y: zeroCorner.y + gridSize, z: zeroCorner.z + k }
      );
    }
    for (var k = 0; k < gridSize + gridScale; k += gridScale) {
      drawLineBetweenPoints(
        { x: zeroCorner.x, y: zeroCorner.y + k, z: zeroCorner.z + i },
        { x: zeroCorner.x + gridSize, y: zeroCorner.y + k, z: zeroCorner.z + i }
      );
    }
    for (var k = 0; k < gridSize + gridScale; k += gridScale) {
      drawLineBetweenPoints(
        { x: zeroCorner.x + i, y: zeroCorner.y + k, z: zeroCorner.z },
        { x: zeroCorner.x + i, y: zeroCorner.y + k, z: zeroCorner.z + gridSize }
      );
    }
  }
  ctx.strokeStyle = DEFAULT_COLOR;
}

function drawPoint(point) {
  point = rotatePoint3d(camera.rot.y, camera.rot.x, point, camera.position);

  var point_dist_cam = distToCamPlane(point);

  var projection_x =
    ((point.x - camera.position.x) * camera.horizontalZoom) / point_dist_cam +
    camera.offset.x;
  var projection_y =
    ((point.y + camera.position.y) * camera.verticalZoom) / point_dist_cam +
    camera.offset.y;

  if (point_dist_cam > 0) {
    ctx.beginPath();
    ctx.arc(
      projection_x,
      projection_y,
      style.point.radius / point_dist_cam / 2,
      0,
      Math.PI * 2,
      true
    );
    ctx.fill();

    return {
      x: projection_x,
      y: projection_y,
      distToCam: point_dist_cam,
      radius: style.point.radius / point_dist_cam / 2,
    };
  }
}

function drawLineBetweenPoints(edge_start, edge_end) {
  edge_start = rotatePoint3d(
    camera.rot.y,
    camera.rot.x,
    edge_start,
    camera.position
  );

  edge_end = rotatePoint3d(
    camera.rot.y,
    camera.rot.x,
    edge_end,
    camera.position
  );

  var start_dist_cam = distToCamPlane(edge_start);
  var end_dist_cam = distToCamPlane(edge_end);
  if (end_dist_cam > start_dist_cam) {
    var temp = end_dist_cam;
    end_dist_cam = start_dist_cam;
    start_dist_cam = temp;

    temp = edge_end;
    edge_end = edge_start;
    edge_start = temp;
  }

  if (start_dist_cam > 0) {
    if (end_dist_cam < 0) {
      //this is not perfect at all. lines sometimes dont go all the way to the camera plane i think

      var dir_vector = {
        x: edge_end.x - edge_start.x,
        y: edge_end.y - edge_start.y,
        z: edge_end.z - edge_start.z,
      }; //the directional vector for the line to draw

      coef = (camera.position.z - edge_start.z) / dir_vector.z - 0.01; //cut off 0.01 units in front of camera plane

      edge_end = {
        x: edge_start.x + coef * dir_vector.x,
        y: edge_start.y + coef * dir_vector.y,
        z: edge_start.z + coef * dir_vector.z,
      };
    }

    end_dist_cam = distToCamPlane(edge_end);

    var projection_start_x =
      ((edge_start.x - camera.position.x) * camera.horizontalZoom) /
        Math.abs(start_dist_cam) +
      camera.offset.x;
    var projection_start_y =
      ((edge_start.y + camera.position.y) * camera.verticalZoom) /
        Math.abs(start_dist_cam) +
      camera.offset.y;

    var projection_end_x =
      ((edge_end.x - camera.position.x) * camera.horizontalZoom) /
        Math.abs(end_dist_cam) +
      camera.offset.x;
    var projection_end_y =
      ((edge_end.y + camera.position.y) * camera.verticalZoom) /
        Math.abs(end_dist_cam) +
      camera.offset.y;

    ctx.beginPath();
    ctx.moveTo(projection_start_x, projection_start_y);
    ctx.lineTo(projection_end_x, projection_end_y);
    ctx.closePath();
    ctx.stroke();
  }
}

//rotates vec1 by theta (yaw), and phi (pitch) about vec2.
function rotatePoint3d(θ, φ, vec1, vec2) {
  return rotatePointX(φ, rotatePointY(θ, vec1, vec2), {
    x: vec2.x,
    y: -vec2.y,
    z: vec2.z,
  });
}

//rotates vec1 by theta about vec2 in the Y plane
function rotatePointY(theta, vec1, vec2) {
  var x0 = vec2.x || 0;
  var y0 = vec2.y || 0;
  var z0 = vec2.z || 0;

  var sinTheta = Math.sin(theta);
  var cosTheta = Math.cos(theta);

  var x = vec1.x - x0;
  var z = vec1.z - z0;

  return {
    x: x * cosTheta - z * sinTheta + x0,
    y: vec1.y,
    z: z * cosTheta + x * sinTheta + z0,
  };
}

function rotatePointX(theta, vec1, vec2) {
  var x0 = vec2.x || 0;
  var y0 = vec2.y || 0;
  var z0 = vec2.z || 0;

  var sinTheta = Math.sin(theta);
  var cosTheta = Math.cos(theta);

  var y = vec1.y - y0;
  var z = vec1.z - z0;

  return {
    x: vec1.x,
    y: y * cosTheta - z * sinTheta + y0,
    z: z * cosTheta + y * sinTheta + z0,
  };
}

function rotatePointZ(theta, vec1, vec2) {
  var x0 = vec2.x || 0;
  var y0 = vec2.y || 0;
  var z0 = vec2.z || 0;

  var sinTheta = Math.sin(theta);
  var cosTheta = Math.cos(theta);

  var x = vec1.x - x0;
  var y = vec1.y - y0;

  return {
    x: x * cosTheta - y * sinTheta + x0,
    y: y * cosTheta + x * sinTheta + y0,
    z: vec1.z,
  };
}

function distToCamPlane(point) {
  var xthing = point.x - camera.position.x;
  var ything = point.y - camera.position.y;
  var zthing = point.z - camera.position.z;

  var normal = [0, 0, 1];

  xthing = normal[0] * xthing;
  ything = normal[1] * ything;
  zthing = normal[2] * zthing;

  if (xthing + ything + zthing > 0) {
    return -distBetPoints(xthing, ything, zthing);
  } else {
    return distBetPoints(xthing, ything, zthing);
  }
}

function distBetPoints(x1, y1, z1, x2, y2, z2) {
  var x2 = x2 || 0;
  var y2 = y2 || 0;
  var z2 = z2 || 0;
  return Math.sqrt(
    (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2) + (z1 - z2) * (z1 - z2)
  );
}
