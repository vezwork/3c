//TODO: add faces and shading, pre-processing auto intersection correction, the drawing stack, objects

//TODO DAY 2: camera plane line cutting, faces / planes, live render intersection?, camera_rot_y+z
//add_object(), docs, movement acceleration, max draw distance, x-y-z coordinate lines, horizon gradient

//todo 2017: add project point function and then add right-click-drag preview and placed point connection preview

//modify these vars for interesting results!
var vertices = [
  [-1,-1,-1],
  [-1,-1,1],
  [-1,1,-1],
  [-1,1,1],
  [1,-1,-1],
  [1,-1,1],
  [1,1,-1],
  [1,1,1],
  [3,3,3],
  [4,4.1,3.3],
  
  [-1,-1,16],
  [-1,-1,18],
  [-1,1,16],
  [-1,1,18],
  [1,-1,16],
  [1,-1,18],
  [1,1,16],
  [1,1,18],
  
  [1, 0, 17]
];
var edges = [
  [0,1],
  [1,3],
  [3,2],
  [2,0],
  [4,5],
  [5,7],
  [7,6],
  [6,4],
  [0,4],
  [1,5],
  [2,6],
  [3,7],
  [0,8],
  [8,9],
  
  [10,11],
  [11,13],
  [13,12],
  [12,10],
  [14,15],
  [15,17],
  [17,16],
  [16,14],
  [10,14],
  [11,15],
  [12,16],
  [13,17],
  
  [6,16],
  [3,13],
];
var centermostVertex = {
    index: null,
    distToCenter: 1000000,
    pointRadius: null,
    x: null,
    y: null
}
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

var horizontal_zoom = 500;	//artificial zooms
var vertical_zoom = 500;
var horizontal_offset = canvas.width/2; //camera center
var vertical_offset = canvas.height/2;
var vertex_radius = 60;	//edge and vertex draw preferences.
var edge_width = 1;
var vertex_color = "rgba(255,155,0,1)";
var edge_color = "rgba(50,20,75,1)"; // not working

var camera_z = 10;
var camera_x = 0;
var camera_y = 0;

var camera_rot_x = 0;
var camera_rot_y = Math.PI;		

var dragVertex = null;
var pointPlaceDistance = 5;

var mouse_x = 0;
var mouse_y = 0;

var gridOn = false;
var gridScale = 0.25;

var storedData = JSON.parse(localStorage.getItem("world"));
if (storedData) {
    vertices = storedData.vertices,
    edges = storedData.edges
}

canvas.addEventListener("contextmenu",function(e){e.preventDefault()});

canvas.addEventListener("mousedown",function(e){
    if (e.button == 2) {
        if (centermostVertex.pointRadius > 2) {
            dragVertex = centermostVertex.index;
        }
    } else if (e.button === 1) {
        vertices.splice(centermostVertex.index, 1, []); 
    } else {
        canvas.requestPointerLock();
        

        var cx = pointPlaceDistance * Math.sin(camera_rot_y+Math.PI) * Math.sin(Math.PI*2/4+camera_rot_x);
        var cy = pointPlaceDistance * Math.cos(Math.PI*2/4+camera_rot_x);
        var cz = pointPlaceDistance * Math.cos(camera_rot_y+Math.PI) * Math.sin(Math.PI*2/4+camera_rot_x);
        if (gridOn) {
            vertices.push([roundToNearest(camera_x+cx, gridScale), roundToNearest(-camera_y+cy, gridScale), roundToNearest(camera_z+cz, gridScale)]);
        } else {
            vertices.push([camera_x+cx, -camera_y+cy, camera_z+cz]);
        }
    }
    localStorage.setItem('world', JSON.stringify({
        vertices: vertices,
        edges: edges
    }));
});

canvas.addEventListener("mouseup",function(e){
    if (e.button == 2) {
        if (dragVertex && centermostVertex.pointRadius > 2) {
            edges.push([dragVertex, centermostVertex.index]);
        } 
        dragVertex = null;
    }
    localStorage.setItem('world', JSON.stringify({
        vertices: vertices,
        edges: edges
    }));
});
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
    }
canvas.addEventListener('mousemove', function(e) {
    var mousePos = getMousePos(canvas, e);

    var mouse_x_prev = mouse_x;
    var mouse_y_prev = mouse_y;

    mouse_x = mousePos.x;
    mouse_y = mousePos.y;

    var xshift = e.movementX/300;
    var yshift = e.movementY/300;

    camera_rot_y -= xshift;
    camera_rot_x -= yshift;
    if (camera_rot_x > Math.PI/2) {
        camera_rot_x = Math.PI/2;
    } else if (camera_rot_x < -Math.PI/2) {
        camera_rot_x = -Math.PI/2;
    }
});

function draw() {
    var reqanim;
    
    ctx_draw();
    
    function ctx_draw() {
      ctx.clearRect(0,0, canvas.width, canvas.height);
	  //ctx.fillStyle = 'rgba(255,255,255,0.6)';
	  //ctx.fillRect(0,0,canvas.width,canvas.height); //motion blur
      
      ctx.strokeStyle = edge_color;
      ctx.lineWidth = edge_width;
      for (var j = 0; j < edges.length; j++) {
        var edge_start = vertices[edges[j][0]];
        var edge_end = vertices[edges[j][1]];
		drawLineBetweenPoints(edge_start, edge_end);
		
      }

      ctx.fillStyle = vertex_color;
      for (var i = 0; i < vertices.length; i++) {
        drawPoint(vertices[i], i);

        //draw reticle grid
        if (gridOn) {
            var base = [roundToNearest(vertices[i][0], gridScale), roundToNearest(vertices[i][1], gridScale), roundToNearest(vertices[i][2], gridScale)];
            drawGrid(base, gridScale*2, gridScale);
        }
      }

      ctx.strokeStyle = edge_color;
      ctx.fillStyle = vertex_color;
      ctx.lineWidth = edge_width;
      keyHandler();
      selectorCircleHandler();
      reqanim = window.requestAnimationFrame(ctx_draw);
    }  
}

var selectorCircle = {
    x:canvas.width/2,
    y:canvas.height/2,
    radius: 100,
    opacity: 1
}

function selectorCircleHandler() {
    var circleRadius = 100;

    //interpolate selector-snap circle
    if (centermostVertex.distToCenter < 100 && centermostVertex.pointRadius > 2) {
        //draw increased size vertex
        ctx.beginPath();
        ctx.arc(centermostVertex.x, centermostVertex.y, centermostVertex.pointRadius+10, 0, Math.PI*2, true);
        ctx.fill();

        selectorCircle.x -= (selectorCircle.x - centermostVertex.x) * 0.2;
        selectorCircle.y -= (selectorCircle.y - centermostVertex.y) * 0.2;
        selectorCircle.radius -= (selectorCircle.radius - (centermostVertex.pointRadius + 13)) * 0.1;
        selectorCircle.opacity -= (selectorCircle.opacity - 1) * 0.1;
    } else {
        selectorCircle.x -= (selectorCircle.x - canvas.width/2) * 0.1;
        selectorCircle.y -= (selectorCircle.y - canvas.height/2) * 0.1;
        selectorCircle.radius -= (selectorCircle.radius - 100) * 0.1;
        selectorCircle.opacity -= (selectorCircle.opacity - 0.1) * 0.1;
    }

    //draw connector for dragVertex
    var cx = pointPlaceDistance * Math.sin(camera_rot_y+Math.PI) * Math.sin(Math.PI*2/4+camera_rot_x);
    var cy = pointPlaceDistance * Math.cos(Math.PI*2/4+camera_rot_x);
    var cz = pointPlaceDistance * Math.cos(camera_rot_y+Math.PI) * Math.sin(Math.PI*2/4+camera_rot_x);
    if (gridOn) {
        var newPoint = [roundToNearest(camera_x+cx, gridScale), roundToNearest(-camera_y+cy, gridScale), roundToNearest(camera_z+cz, gridScale)];
    } else {
        var newPoint = [camera_x+cx, -camera_y+cy, camera_z+cz];
    }

    if (dragVertex) {
        if (centermostVertex.distToCenter < 100 && centermostVertex.pointRadius > 2) {
            drawLineBetweenPoints(vertices[dragVertex], vertices[centermostVertex.index]);
        } else {
            drawLineBetweenPoints(vertices[dragVertex], newPoint);
        }
    }

    //draw selector-snap circle
    ctx.beginPath();
    ctx.globalAlpha = selectorCircle.opacity;
    ctx.arc(selectorCircle.x,selectorCircle.y,selectorCircle.radius,0,2*Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;

    //draw reticle
    var pointRadius = vertex_radius/pointPlaceDistance/2;

    ctx.beginPath();
    ctx.moveTo(canvas.width/2-pointRadius,canvas.height/2);
    ctx.lineTo(canvas.width/2+pointRadius,canvas.height/2);
    ctx.moveTo(canvas.width/2,canvas.height/2-pointRadius);
    ctx.lineTo(canvas.width/2,canvas.height/2+pointRadius);
    ctx.stroke();

    //draw reticle grid
    if (gridOn) {
        drawGrid(newPoint, gridScale*2, gridScale);
    }

    //draw placement distance text
    ctx.strokeText(pointPlaceDistance.toPrecision(3), canvas.width/2+3, canvas.height/2-3);

    //draw gridscale text
    if (shift_pressed) {
        ctx.strokeStyle = 'red';
        ctx.strokeText(gridScale.toPrecision(5), canvas.width/2+3, canvas.height/2+9);
    }
    
    centermostVertex.distToCenter = 10000000;
}

function drawGrid(point, gridSize, gridScale) {
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.1;
    var base = [point[0]-gridSize/2, point[1]-gridSize/2, point[2]-gridSize/2]
    for (var i = 0; i < gridSize+gridScale; i+=gridScale) {
        for (var k = 0; k < gridSize+gridScale; k+=gridScale) {
            drawLineBetweenPoints([base[0]+i, base[1], base[2]+k], [base[0]+i, base[1]+gridSize, base[2]+k]);
        }
        for (var k = 0; k < gridSize+gridScale; k+=gridScale) {
            drawLineBetweenPoints([base[0], base[1]+k, base[2]+i], [base[0]+gridSize, base[1]+k, base[2]+i]);
        }
        for (var k = 0; k < gridSize+gridScale; k+=gridScale) {
            drawLineBetweenPoints([base[0]+i, base[1]+k, base[2]], [base[0]+i, base[1]+k, base[2]+gridSize]);
        }
    }
    ctx.strokeStyle = edge_color;
    ctx.lineWidth = edge_width;
}

function drawPoint(point, i) {
    point = rotatePoint3d(camera_rot_y, camera_rot_x, point, [camera_x, camera_y, camera_z]);
    
    var point_dist_cam = distToCamPlane(point[0],point[1],point[2]);
    
    var projection_x = (point[0]-camera_x)*horizontal_zoom/point_dist_cam+horizontal_offset;
    var projection_y = (point[1]+camera_y)*vertical_zoom/point_dist_cam+vertical_offset;
    
    if (point_dist_cam > 0) {
         
        ctx.beginPath();
        ctx.arc(projection_x, projection_y, vertex_radius/point_dist_cam/2, 0, Math.PI*2, true);
        ctx.fill();
        
        if (i !== undefined) {
            var curVertexDist = distBetPoints(projection_x,projection_y,0,canvas.width/2,canvas.height/2,0);
            if (curVertexDist < centermostVertex.distToCenter && vertex_radius/point_dist_cam/2 > 2) {
                centermostVertex.x = projection_x;
                centermostVertex.y = projection_y;
                centermostVertex.distToCenter = curVertexDist;
                centermostVertex.index = i;
                centermostVertex.pointRadius = vertex_radius/point_dist_cam/2;
            }
        }
    }
}

function drawLineBetweenPoints(edge_start, edge_end) {
    edge_start = rotatePoint3d(camera_rot_y, camera_rot_x, edge_start, [camera_x, camera_y, camera_z]);
    
    edge_end = rotatePoint3d(camera_rot_y, camera_rot_x, edge_end, [camera_x, camera_y, camera_z]);
    
    var start_dist_cam = distToCamPlane(edge_start[0],edge_start[1],edge_start[2]);
    var end_dist_cam = distToCamPlane(edge_end[0],edge_end[1],edge_end[2]);
    if (end_dist_cam > start_dist_cam) {
        var temp = end_dist_cam;
        end_dist_cam = start_dist_cam;
        start_dist_cam = temp;
        
        temp = edge_end;
        edge_end = edge_start;
        edge_start = temp;
    }
    
    if (start_dist_cam > 0) {
        
        if (end_dist_cam < 0) {	//this is not perfect at all. lines sometimes dont go all the way to the camera plane i think
            
            var dir_vector = [edge_end[0]-edge_start[0],
            edge_end[1]-edge_start[1],
            edge_end[2]-edge_start[2]]	//the directional vector for the line to draw
            
            coef = (camera_z - edge_start[2]) / dir_vector[2] - 0.01; //cut off 0.01 units in front of camera plane
            
            var edge_end_x = edge_start[0] + coef*dir_vector[0];
            var edge_end_y = edge_start[1] + coef*dir_vector[1];
            var edge_end_z = edge_start[2] + coef*dir_vector[2];
            
        } else {
            var edge_end_x = edge_end[0];
            var edge_end_y = edge_end[1];
            var edge_end_z = edge_end[2];
        }
        
        end_dist_cam = distToCamPlane(edge_end_x,edge_end_y,edge_end_z);
        
        var projection_start_x = (edge_start[0]-camera_x)*horizontal_zoom/Math.abs(start_dist_cam)+horizontal_offset;
        var projection_start_y = (edge_start[1]+camera_y)*vertical_zoom/Math.abs(start_dist_cam)+vertical_offset;
        
        var projection_end_x = (edge_end_x-camera_x)*horizontal_zoom/Math.abs(end_dist_cam)+horizontal_offset;
        var projection_end_y = (edge_end_y+camera_y)*vertical_zoom/Math.abs(end_dist_cam)+vertical_offset;

        ctx.beginPath();
        ctx.moveTo(projection_start_x, projection_start_y);
        ctx.lineTo(projection_end_x, projection_end_y);
        ctx.closePath();
        ctx.stroke();
    }
}

//rotates vec1 by theta (yaw), and phi (pitch) about vec2.
function rotatePoint3d(θ, φ, vec1, vec2) {
    return rotatePointX(φ, rotatePointY(θ, vec1, vec2), [vec2[0], -vec2[1], vec2[2]]);
}

//rotates vec1 by theta about vec2 in the Y plane
function rotatePointY(theta, vec1, vec2) {
	var x0 = vec2[0] || 0;
	var y0 = vec2[1] || 0;
	var z0 = vec2[2] || 0;	
	
	var sinTheta = Math.sin(theta);
	var cosTheta = Math.cos(theta);
	
	var x = vec1[0] - x0;
    var z = vec1[2] - z0;
    
	return [
		x*cosTheta-z*sinTheta + x0,
		vec1[1],
		z*cosTheta+x*sinTheta + z0
	];
}

function rotatePointX(theta, vec1, vec2) {
	var x0 = vec2[0] || 0;
	var y0 = vec2[1] || 0;
	var z0 = vec2[2] || 0;	
	
	var sinTheta = Math.sin(theta);
	var cosTheta = Math.cos(theta);
	
	var y = vec1[1] - y0;
    var z = vec1[2] - z0;
    
	return [
		vec1[0],
		y*cosTheta-z*sinTheta + y0,
		z*cosTheta+y*sinTheta + z0
	];
}

function rotatePointZ(theta, vec1, vec2) {
	var x0 = vec2[0] || 0;
	var y0 = vec2[1] || 0;
	var z0 = vec2[2] || 0;	
	
	var sinTheta = Math.sin(theta);
	var cosTheta = Math.cos(theta);
	
	var x = vec1[0] - x0;
    var y = vec1[1] - y0;
    
	return [
		x*cosTheta-y*sinTheta + x0,
		y*cosTheta+x*sinTheta + y0,
		vec1[2]
	];
}

function rotateZ(theta, x0, y0, z0) {
	var x0 = x0 || 0;
	var y0 = y0 || 0;
	var z0 = z0 || 0;
	
  var sinTheta = Math.sin(theta);
  var cosTheta = Math.cos(theta);
  for (i = 0; i < vertices.length; i++) {
    var x = vertices[i][0] - x0;
    var y = vertices[i][1] - y0;
    
    vertices[i][0] = x*cosTheta-y*sinTheta + x0;
    vertices[i][1] = y*cosTheta+x*sinTheta + y0;
  }
}

function rotateY(theta, x0, y0, z0) {
	var x0 = x0 || 0;
	var y0 = y0 || 0;
	var z0 = z0 || 0;	
	
  var sinTheta = Math.sin(theta);
  var cosTheta = Math.cos(theta);
  for (i = 0; i < vertices.length; i++) {
    var x = vertices[i][0] - x0;
    var z = vertices[i][2] - z0;
    
    vertices[i][0] = x*cosTheta-z*sinTheta + x0;
    vertices[i][2] = z*cosTheta+x*sinTheta + z0;
  }
}

function rotateX(theta, x0, y0, z0) {
	var x0 = x0 || 0;
	var y0 = y0 || 0;
	var z0 = z0 || 0;	
	
  var sinTheta = Math.sin(theta);
  var cosTheta = Math.cos(theta);
  for (i = 0; i < vertices.length; i++) {
	var y = vertices[i][1] - y0;
	var z = vertices[i][2] - z0;
	
	vertices[i][1] = y*cosTheta-z*sinTheta + y0;
	vertices[i][2] = z*cosTheta+y*sinTheta + z0;
  }
}

function translate(x0, y0, z0) {
	var x0 = x0 || 0;
	var y0 = y0 || 0;
	var z0 = z0 || 0;	
	
  for (i = 0; i < vertices.length; i++) {
	vertices[i][0] = vertices[i][0] + x0;
	vertices[i][1] = vertices[i][1] + y0;
	vertices[i][2] = vertices[i][2] + z0;
  }
}

function distBetPoints(x1,y1,z1,x2,y2,z2) {
	var x2 = x2 || 0;
	var y2 = y2 || 0;
	var z2 = z2 || 0;
	return Math.sqrt(
		(x1-x2)*(x1-x2) +
		(y1-y2)*(y1-y2) +
		(z1-z2)*(z1-z2)
	);
}

function distToCamPlane(x,y,z){
	var xthing = x - camera_x;
	var ything = y - camera_y;
	var zthing = z - camera_z;
	
	var normal = [0,0,1];
	
	xthing = normal[0] * xthing;
	ything = normal[1] * ything;
	zthing = normal[2] * zthing;
	
	if (xthing + ything + zthing > 0) {
		return -1*distBetPoints(xthing, ything, zthing);
	} else {
		return distBetPoints(xthing, ything, zthing);
	}
	
}

canvas.addEventListener("mousewheel", MouseWheelHandler, false);
	// Firefox
canvas.addEventListener("DOMMouseScroll", MouseWheelHandler, false);

function MouseWheelHandler(e) {
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
    if (shift_pressed) {
        if (delta === 1) {
            gridScale *= 2;
        } else {
            gridScale *= 0.5;
        }
    } else {
        if (gridOn) {
            pointPlaceDistance += delta*gridScale;
        } else {
            pointPlaceDistance += delta/10;
        }
    }

    horizontal_zoom = Math.max(500, pointPlaceDistance * 50);	//artificial zooms
    vertical_zoom = Math.max(500, pointPlaceDistance * 50);
}

document.onkeydown = checkKeyDown;
document.onkeyup = checkKeyUp;

var up_pressed = false;
var down_pressed = false;
var right_pressed = false;
var left_pressed = false;
var space_pressed = false;
var fly_pressed = false;
var descend_pressed = false;
var shift_pressed = false;

function checkKeyUp(e) {
	e = e || window.event;

    if (e.keyCode == '38' || e.keyCode == '87') {
		up_pressed = false;
    }
    if (e.keyCode == '40' || e.keyCode == '83') {
		down_pressed = false;
    }
    if (e.keyCode == '37' || e.keyCode == '65') {
		left_pressed = false;
    }
    if (e.keyCode == '39' || e.keyCode == '68') {
		right_pressed = false;
    }
	if (e.keyCode == '32') {
		space_pressed = false;
    }
    if (e.keyCode == '69') {
        fly_pressed = false;
    }
    if (e.keyCode == '81') {
        descend_pressed = false;
    }
    if (e.keyCode == '16') {
        shift_pressed = false;
    }
}

function checkKeyDown(e) {
    e = e || window.event;

    if (e.keyCode == '38' || e.keyCode == '87') {
		up_pressed = true;
    }
    if (e.keyCode == '40' || e.keyCode == '83') {
		down_pressed = true;
    }
    if (e.keyCode == '37' || e.keyCode == '65') {
		left_pressed = true;
    }
    if (e.keyCode == '39' || e.keyCode == '68') {
		right_pressed = true;
    }
	if (e.keyCode == '32') {
		space_pressed = true;
    }
    if (e.keyCode == '69') {
        fly_pressed = true;
    }
    if (e.keyCode == '81') {
        descend_pressed = true;
    }
    if (e.keyCode == '16') {
        shift_pressed = true;
    }
    if (e.keyCode == '17') {
        gridOn = !gridOn;
    }
}

var movementSpeed = 0.06;

function keyHandler() {
	
	var sinTheta = Math.sin(camera_rot_y);
	var cosTheta = Math.cos(camera_rot_y);
    
    if (shift_pressed) {
        if (up_pressed) {
            camera_z -= movementSpeed;
        }
        if (down_pressed) {
            camera_z += movementSpeed;
        }
        if (left_pressed) {
            camera_x += movementSpeed;
        }
        if (right_pressed) {
            camera_x -= movementSpeed;
        }
    } else {
        if (up_pressed) {
            camera_x -= sinTheta * movementSpeed;
            camera_z -= cosTheta * movementSpeed;
        }
        if (down_pressed) {
            camera_x += sinTheta * movementSpeed;
            camera_z += cosTheta * movementSpeed;
        }
        if (left_pressed) {
            camera_z += sinTheta * movementSpeed;
            camera_x -= cosTheta * movementSpeed;
        }
        if (right_pressed) {
            camera_z -= sinTheta * movementSpeed;
            camera_x += cosTheta * movementSpeed;
        }
    }
	
	if (fly_pressed) {
        camera_y += movementSpeed;
    }
    if (descend_pressed) {
        camera_y -= movementSpeed;
    }
}

function roundToNearest(numToRound, numToRoundTo) {
    numToRoundTo = 1 / (numToRoundTo);
    return Math.round(numToRound * numToRoundTo) / numToRoundTo;
}