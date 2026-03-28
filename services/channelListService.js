const ChannelList = require('../models/ChannelList');

/**
 * Creates a new channel list for a user.
 */
const createList = async (userId, name, category) => {
  const newList = new ChannelList({
    userId,
    name,
    category
  });
  return await newList.save();
};

/**
 * Adds a channel to a user's list.
 */
const addChannelToList = async (listId, channelId) => {
  const list = await ChannelList.findById(listId);
  if (!list) throw new Error('Lista de canales no encontrada');

  if (!list.channels.includes(channelId)) {
    list.channels.push(channelId);
    return await list.save();
  }
  return list;
};

/**
 * Removes a channel from a user's list.
 */
const removeChannelFromList = async (listId, channelId) => {
  const list = await ChannelList.findById(listId);
  if (!list) throw new Error('Lista de canales no encontrada');

  list.channels = list.channels.filter(id => id.toString() !== channelId.toString());
  return await list.save();
};

/**
 * Retrieves all lists belonging to a user.
 */
const getUserLists = async (userId) => {
  return await ChannelList.find({ userId }).populate('channels', 'nombre plataforma estadisticas.seguidores');
};

/**
 * Retrieves all channels in a specific list.
 */
const getListChannels = async (listId) => {
  const list = await ChannelList.findById(listId).populate('channels');
  if (!list) throw new Error('Lista de canales no encontrada');
  return list.channels;
};

module.exports = {
  createList,
  addChannelToList,
  removeChannelFromList,
  getUserLists,
  getListChannels
};
