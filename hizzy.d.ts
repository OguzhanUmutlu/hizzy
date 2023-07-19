import {
    useCallback,
    useContext,
    useDebugValue,
    useErrorBoundary,
    useId,
    useImperativeHandle,
    useLayoutEffect,
    useMemo,
    useReducer,
    useRef,
    useState
} from "preact/hooks/src/index";
import {
    cloneElement,
    Component,
    createContext,
    createElement,
    createRef,
    Fragment,
    h,
    hydrate,
    isValidElement,
    options,
    render,
    toChildArray
} from "preact";
import {Inputs} from "preact/hooks";
import {HizzyConfiguration as Conf} from "./api";

export function openPage(url: string): void;

export function reloadPage(): void;

export const LinkComponent: (props: {
    path: string | Location
}) => any;

export function useAddon(name: string): any;

export function useEffect(effect: () => any | (() => any), inputs?: Inputs): void;

/** @internal */
export const config: Record<string, string>;
/** @internal */
export const args: Record<string, string | boolean>;

export function resolvePath(path: string): string;

export function fetch(url: RequestInfo | URL, init?: RequestInit & {
    json?: boolean
}): Promise<string>;
export function fetch(url: RequestInfo | URL, init?: RequestInit & {
    json: true
}): Promise<Object>;

export {Conf as UserConfig};

export {
    useCallback,
    useContext,
    useDebugValue, /*useEffect,*/
    useErrorBoundary,
    useId,
    useImperativeHandle,
    useLayoutEffect,
    useMemo,
    useReducer,
    useRef,
    useState,

    cloneElement,
    Component,
    createContext,
    createElement,
    createRef,
    Fragment,
    h,
    hydrate,
    isValidElement,
    options,
    render,
    toChildArray
};