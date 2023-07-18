// @ts-ignore
import Hizzy from "hizzy";

declare class LanguageAddon extends Hizzy.API.AddonModule {
}

type pkg = LanguageAddon & (((props?: {
    children: string
}) => any) & {
    get language(): string
    set language(lang: string)
    get languages(): string[],
    get container(): { readonly [language: string]: Record<string, string> }
    get next(): string
});
export = pkg;