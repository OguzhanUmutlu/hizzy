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

export function openPage(url: string): void;

export function reloadPage(): void;

export const LinkComponent: (props: {
    path: string | Location
}) => any;

export function useAddon(name: string): any;

export function useEffect(effect: () => any | (() => any), inputs?: Inputs): void;

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