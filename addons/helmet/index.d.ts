// @ts-ignore
import Hizzy from "hizzy";

declare class HelmetAddon extends Hizzy.API.AddonModule {
}

type pkg = HelmetAddon | (() => any);
export = pkg;