import {useState} from "hizzy";
import imgURL from "../assets/hizzy.svg";
import "./App.css";

// @server
function addClick() {
    const {set} = Hizzy.useGlobalState(null, 0);
    set(v => v + 1);
}

// @server/respond
function getClicks() {
    return Hizzy.useGlobalState(null, 0).get();
}

function Main() {
    const [count, setCount] = useState(0);
    getClicks().then(setCount);

    function onClick(e) {
        e.preventDefault();
        addClick();
        setCount(count + 1);
    }

    return <div className="container">
        <a href="https://hizzyjs.github.io/" target="_blank"><img src={imgURL} className="logo"
                                                                  alt="Hizzy Logo" draggable={false}/></a>
        <h1>Hizzy</h1>
        <button onClick={onClick} onContextMenu={onClick}>count is {count}</button>
        <p>Edit <code>src/App.jsx</code> and save to test HMR</p>
        <p className="gray">Click on the Hizzy logo to learn more</p>
    </div>;
}

export default Main;