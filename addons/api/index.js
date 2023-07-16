// todo: this. will add features that can directly be put into the onRequest attribute. things like API.json(() => ({a: "b"}))
// or like API.json({a: "b"}). or API.file, API.raw
// not sure if this is needed... they could technically just do (req, res) => res.json({a: "b"})
// new idea! a function to replace the <Routes> thing maybe? maybe an API tag?

const {AddonModule} = Hizzy;

throw new Error("Not done."); // todo

module.exports = class APIAddon extends AddonModule {
};