import Waifu2x from './Waifu2x';

(function(global) {
    if(typeof(window) !== 'undefined') {
        window.Waifu2x = Waifu2x;
        process && (process.versions = {});
    }
    if ('process' in global) {
        module.exports = Waifu2x;
        return;
    }
    global.Waifu2x = Waifu2x;
})((this || 0).self || global);
