const Room = require('./room.js');

let RoomManager = function() {
  this.rooms =  new Map();
};

RoomManager.prototype.getRoom = function(sceneId) {
  return this.rooms.get('' + sceneId);
};

RoomManager.prototype.createRoom = function(sceneId) {
  let roomId = '' + sceneId;
  let room = new Room.Room(roomId);
  this.rooms.set(roomId, room);
  return room;
};

RoomManager.prototype.deleteRoom = function(sceneId) {
  let roomId = '' + sceneId;
  let room = this.getRoom(roomId);
  if (room) {
    console.log('Delete room, sceneId=' + sceneId);
    room.deleteAllConsumer();
    room.deleteProducer();
    this.rooms.delete(roomId);
  }
  return room;
};

RoomManager.prototype.deletePlayer = function(sceneId, playerId) {
  let roomId = '' + sceneId;
  let room = this.getRoom(roomId);
  if (room) {
    room.deleteConsumer(playerId);
  } else {
    // sceneId の設定がない場合には、player がシグナリングサーバから
    // 切断されているので、player の Consumer を削除します。
    this.deleteAllPlayer(playerId);
  }
};

RoomManager.prototype.deleteAllPlayer = function(playerId) {
  this.rooms.forEach((room, sceneId) => {
    console.log('Delete playerId=' + playerId + ', sceneId=' + sceneId);
    room.deleteConsumer(playerId);
  });
};

RoomManager.prototype.deleteAllRooms = function() {
  this.rooms.forEach((room, sceneId) => {
    console.log('Delete room, sceneId=' + sceneId);
    room.deleteAllConsumer();
    room.deleteProducer();
  });
  this.rooms =  new Map();
};

exports.RoomManager = RoomManager;
