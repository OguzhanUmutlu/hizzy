// @ts-ignore
import Hizzy from "hizzy";

declare class ImagesAddon extends Hizzy.API.AddonModule {
}

type pkg = ImagesAddon | ((props?: {
    src: string
    width?: number
    height?: number
    actualWidth?: number
    actualHeight?: number
    blur?: number
}) => any);
export = pkg;