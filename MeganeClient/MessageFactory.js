const { TextChannel, DMChannel, GroupDMChannel, Message } = require('discord.js');
const { Collection } = require('discord.js');
/**
 * A Utilize class to handle Message creation/editing or adding reactions. 
 */
module.exports = class MessageFactory {
    /**
     * @typedef {Object} MessageFactoryOptions
     * @property {Message|Channel} destination - A message or a channel as a destination to send the message.
     * @property {string} [messageContent] - A string for the content of the new message, or to edit an existing message.
     * @property {MessageOptions} [messageOptions] - Options to format embeds for the message.
     * @property {boolean} [edit=false] - If destination is a Message, apply all the content/emojis to this message as an edit.
     * @property {boolean} [typing=false] - Does the bot pretend to type this message out? Generally shouldnt be used for edit messages
     * @property {boolean} [reply=false] - If destination is a Message, send the message as an reply to that message. (This is mutually exclusive to edit) 
     * @property {ReactionUtil[]} [reactions] - An array of emojis to add to the message. Will delete all orginal emojis if the message already had emojis.
     * @property {number} [deleteTime] - Time in seconds to delete the message
     * @property {number} [destinationDeleteTime] - time in seconds to delete the destination message. (This is mutually exclusive to edit) 
     */

    /**
     * @typedef {Object} ReactionUtil
     * @property {string|Emoji|ReactionEmoji} emoji
     * @property {function} execute - a function to execute when someone reacts to this reaction.
     */

    /**
     * @param {MeganeClient} client 
     * @param {MessageFactoryOptions} options 
     */
    constructor(client, options) {
        this.constructor.preCheck(client, options);
        Object.defineProperty(this, 'client', { value: client });
        if (options.destMessage) this.destMessage = options.destMessage;
        if (options.destChannel) this.destChannel = options.destChannel;
        if (options.messageContent) this.messageContent = options.messageContent;
        if (options.messageOptions) this.messageOptions = options.messageOptions;
        if (options.reactions) this.reactions = options.reactions;
        this.edit = options.edit ? options.edit : false;
        this.typing = options.typing ? options.typing : false;
        this.reply = options.reply ? options.reply : false;
        if (typeof options.deleteTime === 'number') this.deleteTime = Math.floor(options.deleteTime * 1000); //convert to ms
        if (typeof options.destinationDeleteTime === 'number') this.destinationDeleteTime = Math.floor(options.destinationDeleteTime * 1000); //convert to ms
    }
    
    async execute() {
        let msgPromise = null;
        if (this.typing) {//a simulated typing msg
            let channel = this.destMessage ? this.destMessage.channel : this.destChannel;
            channel.startTyping();
            msgPromise = new Promise((replyResolve) => {
                let typelength = this.messageContent ? this.messageContent.length : 0 + this.messageOptions ? JSON.stringify(this.messageOptions).length : 0;
                let typeduration = this.typelength * 30 + 100;
                setTimeout(() => {
                    channel.stopTyping(true);
                    return replyResolve(sendMessage());
                }, (typeduration));
            });
        } else
            msgPromise = this.sendMessage();
        let msgToPostProcess = await msgPromise;
        if (!msgToPostProcess && this.destMessage) msgToPostProcess = this.destMessage;//there is a chance that no presending is needed, and its only updating the emoji/delete
        if (!msgToPostProcess) return;// in theory this shouldn't happen...
        //do the post process on the message
        //TODO if a message is deleted, remove it from the waitlist
        if (Number.isInteger(this.deleteTime) && msgToPostProcess.deletable) msgToPostProcess.delete(this.deleteTime).catch(console.error);
        if (Number.isInteger(this.destinationDeleteTime)  && this.destMessage && this.destMessage.deletable) this.destMessage.delete(this.destinationDeleteTime).catch(console.error);
        let dmChannel = msgToPostProcess.channel.type === "dm";//reactions and such interactions does not work for a DM channel.
        if (this.reactions) {
            if (!dmChannel)
                await msgToPostProcess.clearReactions();
            for (let reaction of this.reactions)
                await msgToPostProcess.react(reaction.emoji);
            //add the functions to the waitlist after the reactions are all added.
            for (let reaction of this.reactions) {
                if (reaction.execute && !dmChannel) {
                    if (!this.client.dispatcher.watchlist.has(msgToPostProcess.id))
                        this.client.dispatcher.watchlist.set(msgToPostProcess.id, new Collection());
                    this.client.dispatcher.watchlist.get(msgToPostProcess.id).set(reaction.emoji, reaction);
                }
            }
        }
        return msgToPostProcess;
    }

    sendMessage() {
        if (this.destMessage) {
            if (this.reply)
                return this.destMessage.reply(this.messageContent, this.messageOptions);
            else if (this.edit && this.destMessage.editable)
                return this.destMessage.edit(this.messageContent, this.messageOptions);
            else
                return this.destMessage.channel.send(this.messageContent, this.messageOptions);
        }
        return this.destChannel.send(this.messageContent, this.messageOptions);
    }

    static preCheck(client, options) {
        if (!client) throw new Error('The client must be specified for MessageFactory.');
        if (typeof options !== 'object') throw new TypeError('MessageFactoryOptions must be an Object.');
        if (!options.destination) throw new TypeError('MessageFactoryOptions must have an destination, either a Message or a Channel');
        if (!(options.destination instanceof Message ||
            options.destination instanceof DMChannel ||
            options.destination instanceof GroupDMChannel ||
            options.destination instanceof TextChannel
        )) throw new TypeError('MessageFactoryOptions.destionation must be an instanceof Message, or TextChannel, DMChannel, GroupDMChannel.');
        let destinationTypeofMessage = options.destination instanceof Message;
        if (destinationTypeofMessage)
            options.destMessage = options.destination;
        else
            options.destChannel = options.destination;
        if (options.messageContent && typeof options.messageContent !== 'string') throw new TypeError('MessageFactoryOptions.messageContent must be a string.');
        if (options.messageOptions && typeof options.messageOptions !== 'object') throw new TypeError('MessageFactoryOptions.messageContent must be an object.');
        if (options.reactions && !typeof Array.isArray(options.reactions)) throw new TypeError('MessageFactoryOptions.reactions must be an Array.');
        if (options.reactions)
            for (let reaction of options.reactions)
                if (!reaction.emoji) throw new TypeError('Each element in MessageFactoryOptions.reactions must have an emoji property.');
        if (typeof options.edit !== 'undefined' && typeof options.edit !== 'boolean') throw new TypeError('MessageFactoryOptions.edit must be an boolean.');
        if (typeof options.typing !== 'undefined' && typeof options.typing !== 'boolean') throw new TypeError('MessageFactoryOptions.typing must be an boolean.');
        if (options.typing && (!options.messageContent && !optoins.messageOptions)) throw new Error('MessageFactoryOptions.typing must accompany either MessageFactoryOptions.messageContent or MessageFactoryOptions.messageOptions');
        if (typeof options.reply !== 'undefined' && typeof options.reply !== 'boolean') throw new TypeError('MessageFactoryOptions.reply must be an boolean.');
        if (typeof options.deleteTime === 'number' && options.deleteTime <= 0) throw new TypeError('MessageFactoryOptions.deleteTime must be a positive integer.');
        if (typeof options.destinationDeleteTime === 'number' && options.destinationDeleteTime < 0) throw new TypeError('MessageFactoryOptions.destinationDeleteTime must be a positive integer or 0.');
        if (!destinationTypeofMessage) {
            if (options.destinationDeleteTime) throw new Error('MessageFactoryOptions.destinationDeleteTime does not work when MessageFactoryOptions.destination is not a Message');
            if (options.reply) throw new Error('MessageFactoryOptions.reply does not work when MessageFactoryOptions.destination is not a Message');
            if (options.edit) throw new Error('MessageFactoryOptions.edit does not work when MessageFactoryOptions.destination is not a Message');
        }
    }
}