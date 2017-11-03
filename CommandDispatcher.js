﻿const Command = require.main.exports.getRequire('command');
const CommandMessage = require.main.exports.getRequire('commandmessage');
const util = require.main.exports.getRequire('util');
const { Collection } = require('discord.js');
const MessageUtil = require('./MessageUtil');
/**
 * Interface to handle commands from a CommandDepot
 */
class CommandDispatcher {
    /**
     * @param {MeganeClient} client 
     * @param {CommandDepot} commandDepot 
     */
    constructor(client, commandDepot) {
        Object.defineProperty(this, 'client', { value: client });
        this.commandDepot = commandDepot;
        this.preprocesses = new Set();
        this.pattern = null;
        this.watchlist = new Collection();
    }
    /**
     * Parse through a new message / an edited message
     * @param {Message} message 
     * @param {Message} oldMessage 
     */
    async handleMessage(message, oldMessage) {//old messgae before the update
        if (!this.preCheckMessage(message, oldMessage)) return;
        if (!message.guild.members.has(message.author.id)) 
            await message.guild.members.fetch(message.author.id);  
        let reasons = this.preprocess(message, oldMessage);
        if (reasons) return;
        if (oldMessage) Object.defineProperty(message, 'oldMessage', { value: oldMessage });
        const cmdMsg = this.parseMessage(message);
        if (cmdMsg) {
            cmdMsg.execute();
        } //else throw new Error('Unable to resolve command.');
    }
    async handleReaction(messageReaction, user) {
        if (user.bot) return; //wont respond to bots
        console.log(messageReaction);
        console.log(`NEW REACTION BOOO YEAH emoji.name:${messageReaction.emoji.name}, emoji.id:${messageReaction.emoji.id}, emoji.identifier:${messageReaction.emoji.identifier}, emoji.toString():${messageReaction.emoji.toString()}`);
        if (this.watchlist.has(messageReaction.message.id)) {
            let emojiCollection = this.watchlist.get(messageReaction.message.id);
            if (emojiCollection.has(messageReaction.emoji.toString()))
                this.handleResponse(await emojiCollection.get(messageReaction.emoji.toString()).execute(messageReaction, user));
        }
    }
    async handleResponse(response) {
        if (!response) return;
        if (typeof response === 'string') {
            this.message.reply(response);
        } else if (typeof response === 'object') {
            let msgUtil = new MessageUtil(this.client, response);
            msgUtil.execute();
        } else {
            throw new TypeError("Response must be typeof [null|string|MessageUtilOptions].");
        }
    }

    /**
     * A function that takes (message, OldMessage), and makes a determination whether it should be executed or not. 
     * @typedef {function} Preprocess
     * @returns {false|string} - return false if the CommandMessage should not be stopped, and keep going to be processed; a String for the reason why the CommandMessage has to be blocked.
     */

    /**
     * Add a function to execute for almost every message, even ones without commands. Message is preprocessed before parsing for commands.
     * Note: this is relatively expensive, since almost all messages will be preprocessed.
     * @param {Preprocess} preprocess 
     */
    addPreprocess(preprocess) {
        if (typeof preprocess !== 'function') throw new TypeError("Preprocess must be a function.");
        if (this.preprocesses.has(preprocess)) return false;
        this.preprocesses.add(preprocess);
        return true;
    }
    /**
     * Removes a preprocess
     * @param {Preprocess} preprocess 
     */
    removePrerocess(preprocess) {
        if (typeof preprocess !== 'function') throw new TypeError("Preprocess must be a function.");
        if (this.preprocesses.has(preprocess)) return false;
        this.preprocesses.add(preprocess);
        return true;
    }
    /**
     * Preprocess this message using all the registered preprocesses.
     * @param {Message} message 
     * @param {Message} oldMessage
     * @returns {null|string[]}
     */
    preprocess(message, oldMessage) {
        let reasons = [];
        for (prepro of this.preprocesses) {
            let reason = prepro(message, oldMessage);
            if (reason) {
                reasons.push(reason);
                this.client.emit('commandblocked', cmdMsg, restrictMsg);
            }
        }
    }

    /**
     * this is executed right after receiving the message.
     * Will reject(return false) for messages:
     * * by a bot
     * * that are edits, but same as the original message
     * @param {Message} message the message to handle.
     * @param {OldMessage} OldMessage the message before the update.
     * @private
     */
    preCheckMessage(message, OldMessage) {
        if (message.author.bot) return false; //wont respond to bots
        if (OldMessage && OldMessage.content === message.content) return false;
        return true;
    }
    /**
     * Parse the cmdstring, and arguments for this message.
     * @param {Message} message message to parse for commands
     * @returns {?CommandMessage}
     */
    parseMessage(message) {
        let cont = message.content;
        if (!this.pattern) this.buildPattern();
        const matches = this.pattern.exec(cont);
        if (!matches) return null;
        const cmd = this.client.depot.resolveCommand(matches[2]);
        const argString = cont.substring(matches[0].length);
        if (!cmd) return null;
        return new CommandMessage(this.client, message, cmd, argString);
    }
    buildPattern() {
        const escapedPrefix = util.escapeRegexString(this.client.prefix);
        /* matches {prefix}cmd
         * <{prefix}{cmd}
         * <@{id}> {cmd}
         * <@!{id}> {cmd}
         */
        this.pattern = new RegExp(
            `^(${escapedPrefix}\\s*|<@!?${this.client.user.id}>\\s+(?:${escapedPrefix})?)([^\\s]+)`, 'i'
        );
        return this.pattern;
    }
}
module.exports = CommandDispatcher;