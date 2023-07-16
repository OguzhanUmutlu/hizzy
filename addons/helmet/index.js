const {AddonModule} = Hizzy;
module.exports = class HelmetAddon extends AddonModule {
    onLoad() {
        this.onClientSideLoad = () => {
            return function (props) {
                Hizzy.render(Hizzy.createElement(Hizzy.Fragment, null, ...props.children), document.head);
                return Hizzy.createElement(Hizzy.Fragment, null);
            };
        };
    };
};