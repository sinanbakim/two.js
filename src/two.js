/**
 * @author jonobr1 / http://jonobr1.com/
 * Dependent on Three.js and Underscore.js
 * 
 * Baseline browsers are currently thought to be:
 * http://robertnyman.com/javascript/#javascript-getters-setters-object-defineproperty-compatibility
 */

(function() {

  var root = this;
  var previousTwo = this.Two || {};
  var objects = [];

  /**
   * Globals
   */
  var twos = [], looped, frameCount = 0, on_update, morphIndex = 0;

  /**
   * Constants
   */
  var PI = Math.PI,
    TWO_PI = Math.PI * 2.0,
    HALF_PI = Math.PI * 0.5,
    RENDER_DEPTH = 0;

  /**
   * Cross browser events.
   */
  var dom = {

    hasEventListeners: _.isFunction(root.addEventListener),

    bind: function(elem, event, func, bool) {
      if (this.hasEventListeners) {
        elem.addEventListener(event, func, !!bool);
      } else {
        elem.attachEvent('on' + event, func);
      }
      return this;
    },

    unbind: function(elem, event, func, bool) {
      if (this.hasEventListeners) {
        elem.removeEventListeners(event, func, !!bool);
      } else {
        elem.detachEvent('on' + event, func);
      }
      return this;
    }

  };

  /**
   * two.js is a two-dimensional drawing api built on top of Three.js
   * meant for modern browsers. Because it's in two-dimensions two handles
   * the canvas, renderer, scene, and camera for you.
   *
   * @class
   */
  var Two = function(params) {

    var params = _.defaults(params || {}, {
      type: Two.TYPES.webgl,
      autoplay: true,
      width: 640,
      height: 480,
      fullscreen: false,
      parameters: {
        antialias: true
      }
    });

    this.__playing = params.autoplay;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, params.width, 0, params.height, -10000);

    this.scene.add(this.camera);

    var canvas = params.canvas || document.createElement('canvas');

    _.extend(params.parameters, {
      canvas: canvas
    });

    if (params.type === Two.TYPES.webgl
      && (canvas.getContext('webgl')
        || canvas.getContext('experimental-webgl'))) {

      this.renderer = new THREE.WebGLRenderer(params.parameters);
      params.type = Two.TYPES.webgl;

    } else if (params.type === Two.TYPES.svg) {

      this.renderer = new THREE.SVGRenderer({});

    } else {

      this.renderer = new THREE.CanvasRenderer(params.parameters);
      params.type = Two.TYPES.canvas2d;

    }

    this.type = params.type;
    this.domElement = this.renderer.domElement;

    if (params.fullscreen) {

      var fitted = _.bind(fitToWindow, this);

      _.extend(document.body.style, {
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        position: 'fixed'
      });
      dom.bind(window, 'resize', fitted);
      fitted();

    } else {

      this.renderer.setSize(params.width, params.height);
      this.width = params.width;
      this.height = params.height;

    }

    this.renderer.sortElements = false;

    twos.push(this);

  };

  _.extend(Two.prototype, {

    /**
     * Returns the previous attached object bound to the window's scope.
     * Make's sure there is no object / property collision.
     */
    noConflict: function() {
      return previousTwo;
    },

    /**
     * DOM
     */

    /**
     * @param {Element} the parent element to append two's dom element.
     */
    appendTo: function(elem) {

      if (!_.isElement(elem)) {
        return this;
      }

      elem.appendChild(this.renderer.domElement);

      return this;

    },

    /**
     * @param {Function} callback to be fired when two's resize triggers.
     */
    onResize: function(func) {

      this.__onResize = func;
      return this;

    },

    /**
     * Controls
     */

    /**
     * @param {Function} callback to be fired when two renders shapes to the
     * browser.
     */
    draw: function(func) {

      this.__onUpdate = func;
      return this;

    },

    /**
     * Add this two to the Request Animation Frame loop.
     */
    play: function() {

      if (!looped) {
        Two.start();
      }

      this.__playing = true;
      return this;

    },

    /**
     * Remove this two from the Request Animation Frame loop.
     */
    pause: function() {

      this.__playing = false;
      return this;

    },

    /**
     * Rendering
     */

    /**
     * Render everything to two's canvas.
     */
    render: function() {

      if (!this.__playing) {
        return this;
      }

      if (_.isFunction(this.__onUpdate)) {
        this.__onUpdate(frameCount);
      }

      this.renderer.render(this.scene, this.camera);
      return this;

    },

    /**
     * Add a two primitive to the scene.
     */
    add: function(object) {
      this.scene.add(object.mesh);
      return object;
    },

    /**
     * Convenience methods for constructing and adding shapes.
     */

    makeRectangle: function(x, y, width, height) {
      var rect = new Two.Rectangle(x, y, width, height);
      return this.add(rect);
    },

    makeArc: function(x, y, radius, startAngle, endAngle, ccw) {
      var arc = new Two.Arc(x, y, radius, startAngle, endAngle, ccw);
      return this.add(arc);
    },

    makeEllipse: function(x, y, width, height) {
      var ellipse = new Two.Ellipse(x, y, width, height);
      return this.add(ellipse);
    },

    makeCircle: function(x, y, radius) {
      var circle = new Two.Circle(x, y, radius);
      return this.add(circle);
    },

    makeCurve: function(p) {

      var l = arguments.length, points = p;
      if (!_.isArray(p)) {
        for (var i = 0; i < l; i+=2) {
          var x = arguments[i];
          if (!_.isNumber(x)) {
            break;
          }
          var y = arguments[i + 1];
          points.push(new Two.Vector(x, y));
        }
      }

      var last = arguments[l - 1];
      var curve = new Two.Curve(points, _.isBoolean(last) ? last : undefined);
      return this.add(curve);

    },

    makeLine: function(x1, y1, x2, y2) {
      var line = new Two.Line(x1, y1, x2, y2);
      return this.add(line);
    },

    makePolygon: function(p) {

      var l = arguments.length, points = p;
      if (!_.isArray(p)) {
        points = [];
        for (var i = 0; i < l; i+=2) {
          var x = arguments[i];
          if (!_.isNumber(x)) {
            break;
          }
          var y = arguments[i + 1];
          points.push(new Two.Vector(x, y));
        }
      }

      var last = arguments[l - 1];
      var poly = new Two.Polygon(points, _.isBoolean(last) ? last : undefined);
      return this.add(poly);

    },

    makeGroup: function() {
      var group = new Two.Group(arguments);
      return this.add(group);
    }

  });

  _.extend(Two, {

    VERSION: 0.1,

    TYPES: {
      webgl: 'webgl',
      canvas2d: 'canvas2d'
    },

    RESOLUTION: 32,

    INSTANCES: twos,

    DEFAULTS: {},

    /**
     * Controls
     */

    /**
     * Turns on Request Animation Frame.
     */
    start: function() {
      if (looped) {
        return this;
      }
      looped = true;
      loop();
      return this;
    },

    onUpdate: function(func) {
      on_update = func;
      return this;
    },

    /**
     * Stop Request Animation Frame.
     */
    stop: function() {
      if (!looped) {
        return this;
      }
      looped = false;
      return this;
    },

    /**
     * Two.Rectangle is a ready-to-be-added-to-the-scene class.
     * @extends Two.Polygon
     * @class
     * 
     * @param {Number} x position of upperleft-corner coordinate.
     * @param {Number} y position of upperleft-corner coordinate.
     * @param {Number} width of rectangle.
     * @param {Number} height of rectangle.
     */
    Rectangle: function(x, y, width, height) {

      this.__width = width;
      this.__height = height;

      var hw = width / 2;
      var hh = height / 2;

      var a = x - hw;
      var b = y - hh;
      var c = x + hw;
      var d = y + hh;

      Two.Polygon.call(this, [
        new Two.Vector(a, b),
        new Two.Vector(c, b),
        new Two.Vector(c, d),
        new Two.Vector(a, d)
      ]);

    },

    /**
     * Two.Arc is a ready-to-be-added-to-the-scene class.
     * @extends Two.Polygon
     * @class
     *
     * @param {Number} x position of center/origin of arc.
     * @param {Number} y position of center/origin of arc.
     * @param {Number} radius of arc.
     * @param {Number} startAngle where the arc begins.
     * @param {Number} endAngle where the arc ends.
     * @param {Boolean} is the arc counter-clockwise.
     */
    Arc: function(x, y, radius, startAngle, endAngle, ccw) {

      this.__radius = radius;

      var phi = Math.min(Math.abs(endAngle - startAngle), TWO_PI);
      var pct = phi / TWO_PI;
      var step = phi / (Two.RESOLUTION * pct);
      var angles = !!ccw ? _.range(-endAngle, -startAngle + step, step)
        : _.range(startAngle, endAngle + step, step);

      var points = _.map(angles, function(theta) {
        var xpos = radius * Math.cos(theta) + x;
        var ypos = radius * Math.sin(theta) + y;
        return new Two.Vector(xpos, ypos);
      });

      points.push(new Two.Vector(x, y));

      Two.Polygon.call(this, points);

    },

    /**
     * Circle is a ready-to-be-added-to-the-scene class.
     * @extends Two.Ellipse
     * @class
     * 
     * @param {Number} x position of center coordinate.
     * @param {Number} y position of center coordinate.
     * @param {Number} radius of circle.
     */
    Circle: function(x, y, radius) {

      this.__radius = radius;

      Two.Ellipse.call(this, x, y, radius, radius);

    },

    /**
     * Two.Ellipse is a ready-to-be-added-to-the-scene class.
     * @extends Two.Polygon
     * @class
     *
     * @param {Number} x position of center coordinate.
     * @param {Number} y position of center coordinate.
     * @param {Number} width of ellipse.
     * @param {Number} height of ellipse.
     */
    Ellipse: function(x, y, width, height) {

      this.__width = width;
      this.__height = height;

      var resolution = Two.RESOLUTION;

      Two.Polygon.call(this, _.map(_.range(resolution), function(i) {
        var pct = (i + 1) / resolution;
        var angle = TWO_PI * pct;
        var xpos = width * Math.cos(angle) + x;
        var ypos = height * Math.sin(angle) + y;
        return new Two.Vector(xpos, ypos);
      }));

    },

    /**
     * Two.Curve is a curved polygon with catmull-rom interpolation.
     */
    Curve: function(points, open) {

      // TODO: This is up for debate still.
      // if (!open && !_.isEqual(points[points.length - 1], points[0])) {
      //   points.push(points[0]);
      // }

      this.spline = new THREE.SplineCurve(points);  // As reference
      var length = points.length * Two.RESOLUTION;

      var curve = _.map(_.range(length), function(i) {
        var p = this.spline.getPoint(i / length);
        return new Two.Vector(p.x, p.y);
      }, this);

      Two.Polygon.call(this, curve, !!open);

    },

    /**
     * Two.Line is a ready-to-be-added-to-the-scene class.
     * 
     * @param {Number} x position of first coordinate.
     * @param {Number} y position of first coordinate.
     * @param {Number} x position of final coordinate.
     * @param {Number} y position of final coordinate.
     * @class
     */
    Line: function(x1, y1, x2, y2) {

      var points = [];
      if (_.isArray(x1)) {
        points = x1;
        x1 = points[0].x;
        y1 = points[0].y;
      } else {
        for (var i = 0, l = arguments.length; i < l; i+=2) {
          points.push(new Two.Vector(arguments[i] - x1, arguments[i + 1] - y1));
        }
      }

      this.geometry = new THREE.Geometry();
      this.geometry.vertices = points;
      this.__vertices = points.slice(0);

      this.material = new THREE.LineBasicMaterial({
        color: 0x000000,
        transparent: true,
        overdraw: true
      });
      this.mesh = new THREE.Line(this.geometry, this.material);

      this.mesh.position.x = x1;
      this.mesh.position.y = y1;

      this.mesh.renderDepth = getRenderDepth();

      objects.push(this);

    },

    /**
     * Two.Polygon is a ready-to-be added to the scene class.
     * 
     * @param {Array} an array of x, y objects to define the shape.
     * @param {Boolean} describe whether the shape is open, true, or closed.
     * @class
     */
    Polygon: function(points, open) {

      var shape = new THREE.Shape(points);

      var bb = shape.getBoundingBox();
      var centroid = new Two.Vector(bb.centroid.x, bb.centroid.y);
      var center = new THREE.Shape();

      _.each(points, function(p, i) {
        p.subSelf(centroid);
        if (i === 0) {
          center.moveTo(p.x, p.y);
        } else {
          center.lineTo(p.x, p.y);
        }
      });

      this.geometry = center.makeGeometry();
      this.material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        // wireframe: true,
        transparent: true, // Hack: for WebGL Rendering
        overdraw: true     // Hack: for canvas Rendering
      });

      // Conversation with doob about possible masking options.

      // Part of this discussion is also here:
      // http://mrdoob.com/projects/htmleditor/#B/bVRtT9swEP5cfsWtfAmoOFkZEusL0wYdTBoaAiS0j058TTwSO3Mcyov633d2kq7Zajmxfff43s+zdxc/zu9/3iwgs0V+tjdrlsEsQy5oHcwKtBySjJsK7XxY2+XR6dAzKvuSo9sNYi1e4M3tBjFPHlOjayWOEp1rM4H9pR9Tzy64SaWaQNQc9ROaZa5XE8ikEKg8de2Eh530WdhaMnNaGsWJkaWFyiTzYWZtOQnDwgitY5ZKm9UxS3QR2swgsl9VGNcyF+2xkIpIwzMS72VsiTvbc7rDEFbaPHLvASy1Ic+NLhDiOiUjG2WJFshSrdMcvaoy9CBZF6GsqhqrUFDMZP5JivnxycfTaD95P3bS5RICWEkl9IpJpdA8SGEzmM/nEMEBvO3iQckNKrtFm/ZgVyjTzP6Da4hTWPso03DrEydveIGGj6BKUOEI6IZAg2ba8VMkZ615GUHBLRrJc9phlU19dKSSNjjwYK6kQ7iTOy5rlVipFTSQthj8r1FJBipcwf3V7WLBbtBUJdKFJzz33ACOT0Y7vA93uDqC9zSjiCI23VLASl1JZwJ7JV2O31g28K721N85Smf5oHO5DykzistlywpgHEUj+EDfmD6a19xm7OYbHMK4dw5h3JnVBbAn95pi+YVXMrluuQFlvW2U6DnyA9bQ2eZC/9/9YEeWOqXeWcaFCHzaNoK6RPeEPWB8+f225bR53SAZtfudfMUdBTvaVYCdJqGTunCF6NqV8bIkeecZtWCwqTYmdLHI0aG6a+t+FW2qiwqpteo39ZX97OmE+Goo6UGH68WLGW09hj2Tt0dwQQCm9IqEHULEKMAn07/VubGp2QRdZ7RVu23e1qMxC5vHiB4n91z+AQ==

      // this.material.blending = THREE.CustomBlending;
      // this.material.blendSrc = THREE.ZeroFactor;
      // this.material.blendDst = THREE.SrcColorFactor;
      // this.material.blendEquation = THREE.AddEquation;

      this.material.side = THREE.DoubleSide;

      var vlength = this.geometry.vertices.length;
      var v1 = this.geometry.vertices[0];
      var v2 = this.geometry.vertices[vlength - 1];

      // Close the shape
      if (!_.isEqual(v1, v2) && !open) {
        this.geometry.vertices.push(v1);
      }

      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.mesh.position.x = bb.centroid.x;
      this.mesh.position.y = bb.centroid.y;

      this.mesh.doubleSided = true;
      this.mesh.renderDepth = getRenderDepth();

      this.outline = new Two.Line(this.geometry.vertices);
      this.mesh.add(this.outline.mesh);

      // Normalize to parent-child relationship
      this.outline.mesh.position.x = 0;
      this.outline.mesh.position.y = 0;

      objects.push(this);

    },

    /**
     * Two.Group is a ready-to-be-added to the scene class. It takes any number
     * of child Two.Shapes and wraps them into a group.
     *
     * @param {Array} child shapes to be added to the group.
     */
    Group: function(children) {

      this.children = [];
      this.mesh = new THREE.Object3D();

      this.add.apply(this, children);
      this.center();

    },

    /**
     * Two.Morph is an object that represents the morph of vertices for a
     * a shape.
     *
     * @param {Two.Shape} a reference to the Two.Shape that you'd like to morph.
     * @param {Array} array of vertices of the new morph.
     * @param {Integer} optional index position of the morph target. TODO
     * @param {String} optional paramater to set name of the morph.
     */
    Morph: function(object, vertices, index, name) {

      if (object.geometry.vertices.length !== vertices.length) {
        throw 'Two Error: vertex amount mismatch.';
      }

      if (!object.material.morphTargets) {
        object.mesh.material.morphTargets = true;
      }

      this.object = object;

      this.index = object.geometry.morphTargets.length;
      this.name = name || 'Two.Morph-' + morphIndex;

      object.geometry.morphTargets.push({
        name: this.name,
        vertices: vertices
      });

      if (object.outline) {
        if (!object.outline.material.morphTargets) {
          // https://github.com/mrdoob/three.js/issues/2875
          // object.outline.material.morphTargets = true;
        }
        object.outline.geometry.morphTargets.push(object.geometry.morphTargets[this.index]);
      }

      this.updateMorphTargets();

      morphIndex++;

    },

    /**
     * Two.Vector is a primitive vector class for use with Three.js with
     * conveniences to neglect the z property.
     * 
     * @extends THREE.Vector3
     * @class
     */
    Vector: function(a, b, c) {

      var l = arguments.length;

      if (l <= 1 && _.isObject(a)) {
        this.x = a.x || 0;
        this.y = a.y || 0;
        this.z = a.z || 0;
      } else {
        this.x = a || 0;
        this.y = b || 0;
        this.z = c || 0;
      }

    }

  });

  var ShapeProto = {

    /**
     * Get the vertex coordinates of a shape.
     * @param {Boolean} Return the actual array, or a clone.
     * @return {Array} of objects with x, y, z position of each coordinate.
     */
    getVertices: function(original) {

      return !!original ? this.geometry.vertices : _.map(this.geometry.vertices, function(v) {
        return v.clone();
      });

    },

    /**
     * Set new coordinate positions for vertices of a given shape.
     * @param {Array} an array of vertices. Does not need to be complete and
     * does not need to be the same length.
     * @param {Boolean} set whether you don't want to update the rendering of
     * the shape. Not usually desired.
     */
    setVertices: function(vertices, silent) {

      _.each(vertices, function(v, i) {
        var vertex = this.geometry.vertices[i];
        if (_.isUndefined(vertex)) {
          vertex = new Two.Vector();
          this.geometry.vertices[i] = vertex;
        }
        vertex.set(v.x, v.y, v.z || 0);
      }, this);

      this.__vertices = this.geometry.vertices.slice(0);

      return !!silent ? this : this.updateVertexFlags();

    },

    /**
     * Force boolean updates to make THREE calculate the new vertex positions.
     */
    updateVertexFlags: function() {

      this.geometry.verticesNeedUpdate = true;
      if (this.outline) {
        this.outline.geometry.verticesNeedUpdate = true;
      }

      return this;

    },

    /**
     * getter-setter to scale the shape. Pass one argument for a uniform scale,
     * two arguments for x, y transform.
     */
    scale: function(x, y) {

      var l = arguments.length;

      if (l <= 0) {
        var scale = this.mesh.scale;
        return scale.x === scale.y ? scale.x : { x: scale.x, y: scale.y };
      } else if (l <= 1) {
        y = x;
      }

      this.mesh.scale.x = x;
      this.mesh.scale.y = y;
      return this;

    },

    /**
     * getter-setter to rotate the shape in radians.
     */
    rotate: function(radians) {

      var l = arguments.length;

      if (l <= 0) {
        return this.mesh.rotation.z;
      }

      this.mesh.rotation.z = radians;
      return this;

    },

    /**
     * getter-setter to position a shape somewhere in two-dimensions.
     */
    translate: function(x, y) {

      var l = arguments.length;

      if (l <= 0) {
        return {
          x: this.mesh.position.x,
          y: this.mesh.position.y
        };
      }

      this.mesh.position.x = x;
      this.mesh.position.y = y;

      return this;

    },

    /**
     * getter-setter for udpating the z-index of an object
     */
    zIndex: function(z) {

      if (arguments.length <= 0) {
        return this.mesh.renderDepth;
      }

      this.mesh.renderDepth = z;

      // Always make sure the stroke is above the fill.
      if (this.outline) {
        this.outline.mesh.renderDepth = z + 1;
      }

      return this;

    },

    /**
     * Add a morph to a shape.
     */
    makeMorph: function(vertices, index, name, reindex) {

      var vertices = vertices.slice(0);//.reverse(); // Copy out, just in case.;

      // HACK: to order morph verts properly
      if (!reindex) {
        vertices = vertices.reverse();
        vertices.pop();
        var first = vertices.shift();
        vertices.push(first, vertices[0]);
      }

      var morph = new Two.Morph(this, vertices, index, name);

      if (!_.isArray(this.morphs)) {
        this.morphs = [];
      }

      this.morphs.push(morph);

      return morph;

    },

    /**
     * Remove an element from its scene.
     */
    remove: function() {

      var parent = this.mesh.parent;
      if (parent) {
        parent.remove(this.mesh);
        if (this.outline) {
          parent.remove(this.outline);
        }
      }

      return this;

    },

    /**
     * Make's a copy of itself and returns the copy.
     * @param {Boolean} pass true if you don't want the cloned shape to be added
     * to the scene.
     *
     * TODO: Incomplete, needs to inherit other properties like color, opacity,
     * stroke weight.
     */
    clone: function(silent) {

      var clone = new this.constructor(this.getVertices());
      clone.mesh.position.copy(this.mesh.position);
      clone.mesh.rotation.copy(this.mesh.rotation);
      clone.mesh.scale.copy(this.mesh.scale);

      if (!silent) {
        this.mesh.parent.add(clone.mesh);
      }

      return clone;

    }

  };

  var MorphProto = {

    getVertices: function(original) {

      var vertices = this.object.geometry.morphTargets[this.index].vertices;
      return !!original ? vertices : vertices.slice(0);

    },

    setVertices: function(vertices) {

      if (this.object.geometry.vertices.length !== vertices.length) {
        throw 'Two error: vertex amount mismatch.';
      }

      this.object.geometry.morphTargets[this.index].vertices = vertices;

      if (this.object.outline) {
        this.object.outline.geometry.morphTargets.push(this.object.mesh.geometry.morphTargets[this.index]);
      }

      this.updateMorphTargets();

      return this;

    },

    influence: function(amt) {

      this.object.mesh.morphTargetInfluences[this.index] = amt;

      if (this.object.outline) {
        this.object.outline.mesh.morphTargetInfluences[this.index] = amt;
      }

      return this;

    },

    /**
     * Until Three can do this we have a wrapper for Two.Morph to do it.
     * TODO: Currently resets everytime a new morph is added — it should
     * gracefully update. This will be available in r54.
     */
    updateMorphTargets: function() {

      var l = this.object.geometry.morphTargets.length;
      var mesh = this.object.mesh;

      if (l) {

        mesh.morphTargetBase = -1;
        mesh.morphTargetForcedOrder = [];
        mesh.morphTargetInfluences = [];
        mesh.morphTargetDictionary = {};

        for (var m = 0; m < l; m++) {

          mesh.morphTargetInfluences.push(0);
          mesh.morphTargetDictionary[mesh.geometry.morphTargets[m].name] = m;

        }

        // Do it for the outline as well

        var outline = this.object.outline;

        if (outline) {

          outline.mesh.morphTargetBase = -1;
          outline.mesh.morphTargetForcedOrder = [];
          outline.mesh.morphTargetInfluences = [];
          outline.mesh.morphTargetDictionary = {};

          for (var m = 0; m < l; m++) {

            outline.mesh.morphTargetInfluences.push(0);
            outline.mesh.morphTargetDictionary[mesh.geometry.morphTargets[m].name] = m;

          }

        }

      }

    }

  };

  /**
   * Prototype for Group
   */
  var GroupProto = {

    scale: ShapeProto.scale,

    rotate: ShapeProto.rotate,

    translate: ShapeProto.translate,

    /**
     *
     */
    add: function() {

      var objects = _.toArray(arguments);

      _.each(objects, function(object) {
        object.mesh.position.subSelf(this.mesh.position); // Orient object correctly
        this.mesh.add(object.mesh);
      }, this);

      this.children = this.children.concat(objects);

      return this;

    },

    /**
     * getter-setter for udpating the z-index of an object
     */
    zIndex: function(z) {

      if (arguments.length <= 0) {
        return this.mesh.renderDepth;
      }

      this.mesh.renderDepth = z;

      // Update the children as well
      _.each(this.mesh.children, function(child, i) {
        // Do we set all children to same z-depth, or lesser, or do we need
        // to set it at all?
        child.renderDepth = z - i;  // TODO: Needs to be tested.
      }, this);

      return this;

    },

    /** 
     * Remove stroke from rendering of shapes.
     */
    noStroke: function() {

      return this.stroke(0, 0, 0, 0);

    },

    /**
     * Remove fill from rendering of shapes.
     */
    noFill: function() {

      return this.fill(0, 0, 0, 0);

    },

    /**
     * Set the strokeWeight of all children of the group to a certain amount.
     *
     * @param {Number} the thickness, weight, or sometimes referred to as width
     * of a line.
     */
    strokeWeight: function(n) {

      for (var i = 0, l = this.mesh.children.length; i < l; i++) {

        var child = this.mesh.children[i];
        var material = child.material;

        // Delve deeper if children nested.
        if (child.children.length > 0) {
          this.strokeWeight.call({ mesh: child, strokeWeight: this.strokeWeight }, n);
        }

        if (!material || !(material instanceof THREE.LineBasicMaterial)) {
          continue;
        }

        material.linewidth = n;
        child.visible = n > 0;

      }

      return this;

    },

    /**
     * Set the stroke color and alpha of all children to the group.
     *
     * @param {Number} 0 - 1 value of red.
     * @param {Number} 0 - 1 value of green.
     * @param {Number} 0 - 1 value of blue.
     * @param {Number} 0 - 1 value of alpha.
     */
    stroke: function(r, g, b, a) {

      var length = arguments.length;

      if (length <= 1) {
        g = b = r;
        a = 1.0;
      } else if (length <= 3) {
        a = 1.0;
      }

      for (var i = 0, l = this.mesh.children.length; i < l; i++) {

        var child = this.mesh.children[i];
        var material = child.material;

        // Delve deeper if children nested.
        if (child.children.length > 0) {
          this.stroke.call({ mesh: child, stroke: this.stroke }, r, g, b, a);
        }

        if (!material || !(material instanceof THREE.LineBasicMaterial)) {
          continue;
        }

        material.color.setRGB(r, g, b);
        material.opacity = a;
        child.visible = a > 0;

      }

      return this;

    },

    /**
     * Set the fill color and alpha of all children to the group.
     *
     * @param {Number} 0 - 1 value of red.
     * @param {Number} 0 - 1 value of green.
     * @param {Number} 0 - 1 value of blue.
     * @param {Number} 0 - 1 value of alpha.
     */
    fill: function(r, g, b, a) {

      var length = arguments.length;

      if (length <= 1) {
        g = b = r;
        a = 1.0;
      } else if (length <= 3) {
        a = 1.0;
      }

      for (var i = 0, l = this.mesh.children.length; i < l; i++) {

        var child = this.mesh.children[i];
        var material = child.material;

        // Delve deeper if children nested.
        if (child.children.length > 0) {
          this.fill.call({ mesh: child, fill: this.fill }, r, g, b, a);
        }

        if (!(material instanceof THREE.MeshBasicMaterial)) {
          continue;
        }

        material.color.setRGB(r, g, b);
        material.opacity = a;
        child.visible = a > 0;

      }

      return this;

    },

    /**
     * Update internal variables and calculations to align all shapes to the
     * center of the bounding box of the group.
     */
    center: function() {

      var rect = this.getBoundingClientRect();

      // Apply the new positioning to be anchored center.

      rect.centroid = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };

      _.each(this.children, function(child) {

        child.mesh.position.x -= rect.centroid.x;
        child.mesh.position.y -= rect.centroid.y;

      }, this);

      // Finally update the group so that the current shapes
      // haven't appeared to move.

      this.translate(rect.centroid.x, rect.centroid.y);

      return this;

    },

    /** 
     * Convenience method to return the left, right, top, bottom, width,
     * and height of a group.
     */
    getBoundingClientRect: function() {

      var rect = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };

      _.each(this.children, function(child) {

        var mesh = child.mesh;
        var bb, p = child.mesh.position;

        // Are we a group or a shape?
        if (_.isUndefined(mesh.geometry)) {
          // If we're a group just get the bounding rect and put it in a
          // format that is the same as bb.
          var r = child.getBoundingClientRect();
          bb = {
            minY: r.top,
            minX: r.left,
            maxX: r.right,
            maxY: r.bottom
          };
        } else {
          bb = child.mesh.geometry.shapebb;
        }

        var r = bb.maxX + p.x;
        var l = bb.minX + p.x;
        var t = bb.minY + p.y;
        var b = bb.maxY + p.y;

        rect.left = Math.min(rect.left, l);
        rect.top = Math.min(rect.top, t);
        rect.right = Math.max(rect.right, r);
        rect.bottom = Math.max(rect.bottom, b);

        // this.mesh.add(child.mesh);

      }, this);

      rect.width = rect.right - rect.left;
      rect.height = rect.bottom - rect.top;

      return rect;

    }

  };

  /**
   * Prototype for all objects that have fill-like material
   * Two.Rectangle
   * Two.Arc
   * Two.Circle
   * Two.Ellipse
   * Two.Polygon
   */
  var FillProto = {

    /**
     * Remove the visibility of a fill.
     */
    noFill: function() {

      return this.fill(0, 0, 0, 0);

    },

    /**
     * getter-setter to define the fill's color and opacity of a shape.
     *
     * @param {Number} 0 - 1 value of red.
     * @param {Number} 0 - 1 value of green.
     * @param {Number} 0 - 1 value of blue.
     * @param {Number} 0 - 1 value of alpha.
     */
    fill: function(r, g, b, a) {

      var length = arguments.length;

      if (length <= 0) {
        var c = this.material.color;
        return { r: c.b, g: c.g, b: c.b, a: this.material.opacity };
      } else if (length <= 1) {
        g = b = r;
        a = 1.0;
      } else if (length <= 3) {
        a = 1.0;
      }

      this.material.color.setRGB(r, g, b);
      this.material.opacity = a;
      this.mesh.visible = a > 0 || _.isObject(this.outline);

      return this;

    }

  };

  /**
   * Prototype for all objects that have stroke-like material
   * Two.Line
   */
  var StrokeProto = {

    /**
     * Internal private-ish vars for animating in-and-out shapes.
     */

    beginning: 0.0,

    ending: 1.0,

    /**
     * Remove the visibility of a stroke.
     */
    noStroke: function() {

      this.strokeWeight(0).stroke(0, 0, 0, 0);
      return this;

    },

    /**
     * getter-setter to define the color and opacity of a stroke.
     *
     * @param {Number} 0 - 1 value of red.
     * @param {Number} 0 - 1 value of green.
     * @param {Number} 0 - 1 value of blue.
     * @param {Number} 0 - 1 value of alpha.
     */
    stroke: function(r, g, b, a) {

      var length = arguments.length;
      var outline = _.isObject(this.outline);

      if (length <= 0) {
        var material = (outline ? this.outline : this).material;
        var c = material.color;
        return { r: c.r, g: c.g, b: c.b, a: material.opacity };
      } if (length <= 1) {
        g = b = r;
        a = 1.0;
      } else if (length <= 3) {
        a = 1.0;
      }

      if (_.isObject(this.outline)) {
        this.outline.material.color.setRGB(r, g, b);
        this.outline.material.opacity = a;
        this.outline.mesh.visible = a > 0;
      } else {
        this.material.color.setRGB(r, g, b);
        this.material.opacity = a;
        this.mesh.visible = a > 0;
      }

      return this;

    },

    /**
     * getter-setter to define the weight, thickness, or sometimes referred to
     * as width of a stroke.
     */
    strokeWeight: function(n) {

      var outline = _.isObject(this.outline);

      // Getter
      if (_.isUndefined(n)) {
        return outline ? this.outline.material.linewidth : this.material.linewidth;
      }

      // Setter
      if (outline) {
        this.outline.material.linewidth = n;
        this.outline.mesh.visible = n > 0;
      } else {
        this.material.linewidth = n;
        this.mesh.visible = n > 0;
      }

      return this;

    },

    /**
     * State the position as a percentage of the first point in the stroke.
     * Particularly useful for animating lines in-and-out.
     * Default is 0.0
     *
     * @param {Number} 0 - 1 value of where the first point should lie
     * on the line.
     */
    begin: function(amt) {

      this.beginning = Math.min(Math.max(amt, 0.0), 1.0);

      this.updateStroke();

      return this;

    },

    /**
     * State the position as a percentage of the last point in the stroke.
     * Particularly useful for animating lines in-and-out.
     * Default is 1.0
     *
     * @param {Number} 0 - 1 value of where the last point should lie
     * on the line.
     */
    end: function(amt) {

      this.ending = Math.max(Math.min(amt, 1.0), 0.0);

      this.updateStroke();

      return this;

    },

    /**
     * TODO:
     * Activate will be the underlying function to trigger visible line
     * segments. It takes a series of [min, max] arrays as its arguments.
     */
    activate: function() {

      return this;

    },

    /**
     * function to update the filled-out-ness of a stroke. This is similar
     * to After Effect's plugin Trapcode's Stroke 3D.
     */
    updateStroke: function() {

      var stroke = _.isObject(this.outline) ? this.outline : this;
      var verts = stroke.__vertices;
      var length = verts.length;
      var last = length - 1;

      var a, b;

      if (this.ending > this.beginning) {
        a = this.ending;
        b = this.beginning;
      } else if (this.ending < this.beginning) {
        a = this.beginning;
        b = this.ending;
      } else {
        a = b = this.ending = this.beginning;
      }

      var ia = Math.min(Math.round((1 - a) * length), last);
      var ib = Math.min(Math.round((1 - b) * length), last);

      var v = verts[ia];

      for (var i = 0; i < ia; i++) {
        stroke.geometry.vertices[i] = v;
      }

      v = verts[ib];

      for (var i = ib; i < length; i++) {
        stroke.geometry.vertices[i] = v;
      }

      return this.updateVertexFlags();

    }

  };

  /**
   * Prototype for Two.Polygon
   */
  var PolyProto = {

    

  };

  var CurveProto = {


    /**
     * A morph with a catmull-rom interpolation.
     */
    makeMorph: function(vertices, index, name, reindex) {

      var vertices = vertices.slice(0);
      var length = this.getVertices().length;
      var spline = new THREE.SplineCurve(vertices);

      // HACK: to order morph verts properly
      if (!reindex) {
        vertices = vertices.reverse();
        vertices.pop();
        var first = vertices.shift();
        vertices.push(first, vertices[0]);
      }

      var points = _.map(_.range(length), function(i) {
        var p = spline.getPoint(i / length);
        return new Two.Vector(p.x, p.y);
      }, this);//.reverse();

      return ShapeProto.makeMorph.call(this, points, index, name, true);

    }

  };

  /**
   * Simple getter-setters with ecmascript 5 syntax.
   * Should we do something if your parser isn't 5?
   */

  var RectProto = {};

  Object.defineProperty(Two.Rectangle.prototype, 'width', {

    get: function() {
      return this.__width;
    },

    set: function(width) {

      this.__width = width;

      var vertices = this.getVertices(true);
      var last = vertices.length - 1;
      var hw = width / 2;

      _.each(vertices, function(v, i) {
        if (i > 0 && i < last) {
          v.x = hw;
        } else {
          v.x = -hw;
        }
      }, this);

      return this.updateVertexFlags();

    }

  });

  Object.defineProperty(Two.Rectangle.prototype, 'height', {

    get: function() {
      return this.__height;
    },

    set: function(height) {

      this.__height = height;

      var vertices = this.getVertices(true);
      var last = vertices.length - 1;
      var hh = height / 2;

      _.each(vertices, function(v, i) {
        if (i < 2) {
          v.y = -hh;
        } else {
          v.y = hh;
        }
      }, this);

      return this.updateVertexFlags();

    }

  });

  var EllipseProto = {};

  Object.defineProperty(Two.Ellipse.prototype, 'width', {

    get: function() {
      return this.__width;
    },

    set: function(width) {

      this.__width = width;

      var vertices = this.getVertices(true);
      var amount = vertices.length;
      var w = width, h = this.__height;

      _.each(vertices, function(v, i) {

        var pct = i / amount;
        var x = w * Math.cos(pct * TWO_PI);
        var y = h * Math.sin(pct * TWO_PI);

        v.x = x;
        v.y = y;

      }, this);

      return this.updateVertexFlags();

    }

  });

  Object.defineProperty(Two.Ellipse.prototype, 'height', {

    get: function() {
      return this.__height;
    },

    set: function(height) {

      this.__height = height;

      var vertices = this.getVertices(true);
      var amount = vertices.length;
      var w = this.__width, h = height;

      _.each(vertices, function(v, i) {

        var pct = i / amount;
        var x = w * Math.cos(pct * TWO_PI);
        var y = h * Math.sin(pct * TWO_PI);

        v.x = x;
        v.y = y;

      }, this);

      return this.updateVertexFlags();

    }

  });

  var CircleProto = {};

  Object.defineProperty(Two.Circle.prototype, 'radius', {

    get: function() {
      return this.__radius;
    },

    set: function(radius) {

      this.__radius = radius;

      var vertices = this.getVertices(true);
      var amount = vertices.length;

      _.each(vertices, function(v, i) {

        var pct = i / amount;
        var x = radius * Math.cos(pct * TWO_PI);
        var y = radius * Math.sin(pct * TWO_PI);

        v.x = x;
        v.y = y;

      }, this);

      return this.updateVertexFlags();

    }

  });

  var ArcProto = {};

  Object.defineProperty(Two.Arc.prototype, 'radius', {

    get: function() {
      return this.__radius;
    },

    set: function(radius) {

      var l = arguments.length;
      if (l <= 0) {
        return this.__radius;
      }

      var vertices = this.getVertices(true);
      var amount = vertices.length;

      // TODO: Incomplete

    }

  });

  var VectorProto = {

    clone: function() {
      return new Two.Vector(this.x, this.y);
    }

  };

  // Extensions

  _.extend(Two.Polygon.prototype, ShapeProto, FillProto, StrokeProto, PolyProto);
  _.extend(Two.Line.prototype, ShapeProto, StrokeProto);
  _.extend(Two.Curve.prototype, Two.Polygon.prototype, CurveProto);
  _.extend(Two.Rectangle.prototype, Two.Polygon.prototype, RectProto);
  _.extend(Two.Arc.prototype, Two.Polygon.prototype, ArcProto);
  _.extend(Two.Ellipse.prototype, Two.Polygon.prototype, EllipseProto);
  _.extend(Two.Circle.prototype, Two.Polygon.prototype, CircleProto);
  _.extend(Two.Vector.prototype, THREE.Vector3.prototype);
  _.extend(Two.Group.prototype, GroupProto);
  _.extend(Two.Morph.prototype, MorphProto);

  // Super THREE.Vector3.prototype on Two.Vector
  _.each(THREE.Vector3.prototype, function(v, k) {
    if (_.isFunction(v)) {
      Two.Vector.prototype[k] = function() {
        v.apply(this, arguments);
        if (!this.z) {
          this.z = 0;
        }
      };
    } else {
      Two.Vector.prototype[k] = v;
    }
  });

  _.extend(Two.Vector.prototype, VectorProto);

  function getRenderDepth() {
    var depth = RENDER_DEPTH;
    RENDER_DEPTH--;
    return depth;
  }

  function fitToWindow() {

    var wr = document.body.getBoundingClientRect();

    var width = this.width = wr.width;
    var height = this.height = wr.height;

    this.renderer.setSize(width, height);

    this.camera.top = 0;
    this.camera.left = 0;
    this.camera.right = width;
    this.camera.bottom = height;

    this.camera.updateProjectionMatrix();

    if (_.isFunction(this.__onResize)) {
      this.__onResize(width, height);
    }

  }

  function loop() {
    if (_.isFunction(on_update)) {
      on_update(frameCount);
    }
    _.each(twos, function(two) {
      two.render();
    });
    frameCount++;
    if (looped) {
      requestAnimationFrame(loop);
    }
  }

  /**
   * Export
   */
  root['Two'] = Two;

})();