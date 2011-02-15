if(!ingenioJS.engine.controllers){ ingenioJS.engine.controllers = {}; }

/**
 * @namespace Player Controller (allows a controllable character object)
 * @constructor This will create and return a controller instance.
 * @param {Object} engine The owning engine instance
 * @param {Boolean} [listen] True will cause the controller to listen on keyboard events.
 * @returns {Object} controller instance
 * @todo Next step will be to implement the level jumps / spawns in the player controller, maybe a level controller makes sense
 */
ingenioJS.engine.controllers.player = function(engine){

	// listen on events by default
	var listen = arguments[1] || true;

	this.engine = engine;
	this.cache = this.engine.cache;

	if(listen){
		// listen to document keydown event
		var self = this;
		document.addEventListener('keydown',function(evt){
			self.execute(evt);
		},true);
	}

	// it will be initialized when the event is fired first.
	// why? because otherwise our object is not yet rendered =D
	this.initialized = false;

	return this;

}

ingenioJS.engine.controllers.player.prototype = {

	/**
	 * This internal function will transform a given direction to a coordinate position.
	 * @param {String} direction The requested direction (top, right, botton, left)
	 * @returns {Object} The requested position object in {x, y} format.
	 */
	_getPositionFromDirection: function(direction){

		var targetPosition = {
			x: this.player.position.x,
			y: this.player.position.y
		};

		switch(direction){
			case 'top':
				targetPosition.y--;
			break;
			case 'right':
				targetPosition.x++;
			break;
			case 'bottom':
				targetPosition.y++;
			break;
			case 'left':
				targetPosition.x--;
			break;
		}

		return targetPosition;
	},

	/**
	 * This function is only called when the controller is created.
	 * It will setup the local eventmap wherein the objects are linked to their events
	 */
	init: function(){

		// this controller applies only on player's character
		this.player = this.cache.get('characters', 'player');

		// find the context
		this.context = this.player.node.parentNode;

		// create the eventmap and victimmap

		// they contain only false or the objects stackId
		// ...not the object links, because then they are cached by the javascript engine and that sucks...
		// we otherwise have to rebuild the maps on every change =P
		this._eventmap = {};
		this._victimmap = {};
		var objects = this.cache.get('objects');

		for(var o in objects){
			if(objects.hasOwnProperty(o)){
				var object = objects[o],
					model = object.model;

				// fill our eventmap
				if(object.events){
					for(var x=object.position.x; x<(object.position.x + model.size.x); x++){
						for(var y=object.position.y; y<(object.position.y + model.size.y); y++){
							// the local eventmap contains x and y coordinates referring to the objects
							this._eventmap[x+'x'+y] = o;
						}
					}
				}

				// fill our victimmap (objects that can be removed / destroyed)
				if(object.victim){
					for(var x=object.position.x; x<(object.position.x + model.size.x); x++){
						for(var y=object.position.y; y<(object.position.y + model.size.y); y++){
							// the local eventmap contains x and y coordinates referring to the objects
							this._victimmap[x+'x'+y] = o;
						}
					}
				}
			}
		}

	},

	/**
	 * This function will be executed anytime the keydown event (on document) was fired by the host environment.
	 * It will then handle the keyCodes and move the player to the targeted direction.
	 * @param {Event} event The fired Keyboard Event
	 */
	execute: function(event){

		if(!this.initialized){
			this.init();
		}

		switch(event.keyCode){
			case 81: // Q attack
				this.attack(this.direction || false);
				break;
			case 69: // E talk
				this.talk(this.direction || false);
				break;
			case 87: // W walk top
				this.move('top');
				break;
			case 68: // D walk right
				this.move('right');
				break;
			case 83: // S walk down
				this.move('bottom');
				break;
			case 65: // A walk left
				this.move('left');
				break;
		}

	},

	/**
	 * This function will let the player attack a targeted object. To determine which object is attacked,
	 * it will lookup in the local eventmap for the referenced object.
	 * @param {String} direction The targeted direction, which is top, right, bottom or left.
	 */
	attack: function(direction){

		if(!this.initialized){
			this.init();
		}

		direction = direction || this.direction || false;
		if(!direction){ return; }

		var targetPosition = this._getPositionFromDirection(direction),
			target = this._eventmap[targetPosition.x+'x'+targetPosition.y],
			victim = this._victimmap[targetPosition.x+'x'+targetPosition.y];

		// lookup the position in local eventmap
		if(target){
			target = this.cache.get('objects', target) || this.cache.get('characters', target);
			if(!target || !target.events) return;

			var eventId = target.eventId || 0;
			if(!target.events[eventId]){
				eventId = target.eventId = 0;
			}

			if(target.events[eventId] && target.events[eventId].type=='attack'){
				this.engine.controllers.message && this.engine.controllers.message.execute(target.name || target.id, target.events[eventId].message);

				// next event in object's eventmap
				target.eventId = eventId + 1;
			}
		}

		// lookup the position in local victimmap. Attacked victims will be destroyed / removed.
		if(victim){
			var id = victim;
			var victim = this.cache.get('objects', victim);

			this.engine.removeObject(victim);
			this.cache.del('objects', id);

			for(var x=victim.position.x; x<(victim.position.x + victim.model.size.x); x++){
				for(var y=victim.position.y; y<(victim.position.y + victim.model.size.y); y++){

					// cleanup and prevent further interaction on object
					this._eventmap[x+'x'+y] = false;
					this._victimmap[x+'x'+y] = false;
				}
			}

		}

	},

	/**
	 * This function will let the player talk to a targeted object (which is a dialog event). To determine which object
	 * is talked to, it will lookup in the local eventmap for the referenced object.
	 * @param {String} direction The targeted direction, which is top, right, bottom or left.
	 */
	talk: function(direction){

		if(!this.initialized){
			this.init();
		}

		direction = direction || this.direction || false;
		if(!direction){ return; }

		var targetPosition = this._getPositionFromDirection(direction),
			target = this._eventmap[targetPosition.x+'x'+targetPosition.y];

		if(target){
			target = this.cache.get('objects', target) || this.cache.get('characters', target);
			if(!target || !target.events) return;

			var eventId = target.eventId || 0;
			if(!target.events[eventId]){
				eventId = target.eventId = 0;
			}

			if(target.events[eventId] && target.events[eventId].type=='dialog'){
				this.engine.controllers.message && this.engine.controllers.message.execute(target.name || target.id, target.events[eventId].message);

				// next event in object's eventmap
				target.eventId = eventId + 1;
			}
		}

	},

	/**
	 * This function will move the player to the targeted direction, if there's no blocking entry in the engine's hitmap.
	 * @param {String} direction The targeted direction, which is top, right, bottom or left.
	 * @returns {Boolean} True if compositor was executed on player object. Otherwise false is returned.
	 */
	move: function(direction){

		if(!this.initialized){
			this.init();
		}

		var newPosition = {
			x: this.player.position.x,
			y: this.player.position.y
		};

		switch(direction){
			case 'top':
				if(!this.engine.hitmap.get(newPosition.x, newPosition.y - 1)){
					newPosition.y--;
					this.direction = 'top';
				}
			break;
			case 'right':
				if(!this.engine.hitmap.get(newPosition.x + 1, newPosition.y)){
					newPosition.x++;
					this.direction = 'right';
				}
			break;
			case 'bottom':
				if(!this.engine.hitmap.get(newPosition.x, newPosition.y + 1)){
					newPosition.y++;
					this.direction = 'bottom';
				}
			break;
			case 'left':
				if(!this.engine.hitmap.get(newPosition.x - 1, newPosition.y)){
					newPosition.x--;
					this.direction = 'left';
				}
			break;
		}

		// reset position if it is out of world range
		if(newPosition.x < 0) newPosition.x = 0;
		if(newPosition.y < 0) newPosition.y = 0;

		// remember: position is margin, not the tile grid!
		if(newPosition.x > (this.engine.currentLevel.size.x - 1)) newPosition.x = (this.engine.currentLevel.size.x - 1);
		if(newPosition.y > (this.engine.currentLevel.size.y - 1)) newPosition.y = (this.engine.currentLevel.size.y - 1);

		var viewport = this.engine.viewport;

		// update viewport position if next part of level is reached.
		if(((newPosition.x - 3) < viewport.position.x) && ((newPosition.x - 3) >= 0)){
			this.engine.renderer.updateViewport(newPosition.x - 3, viewport.position.y);
		}else if(newPosition.x > (viewport.position.x + viewport.size.x - 5)){
			this.engine.renderer.updateViewport(newPosition.x - viewport.size.x + 5, viewport.position.y);
		}
		if(((newPosition.y - 3) < viewport.position.y) && ((newPosition.y - 3) >= 0)){
			this.engine.renderer.updateViewport(viewport.position.x, newPosition.y - 3);
		}else if(newPosition.y > (viewport.position.y + viewport.size.y - 4)){
			this.engine.renderer.updateViewport(viewport.position.x, newPosition.y - viewport.size.y + 4);
		}

		// update the position if changed
		if(this.player.position.x != newPosition.x || this.player.position.y != newPosition.y){
			this.player.position = newPosition;
			this.engine.compositor.execute(this.context, this.player);
			return true;
		}

		return false;

	}

};
