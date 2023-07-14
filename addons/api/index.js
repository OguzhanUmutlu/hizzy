// todo: this. will add features that can directly be put into the onRequest attribute. things like API.json(() => ({a: "b"}))
// todo: or like API.json({a: "b"}). or API.file, API.raw
// todo: not sure if this is needed... they could technically just do (req, res) => res.json({a: "b"})

const {AddonModule} = Hizzy;
module.exports = class APIAddon extends AddonModule {
};