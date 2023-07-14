import {useState} from "hizzy";
import "./App.css";

// @server
function addClick() {
    if (!global.count) global.count = 0; // If there is no 'count' variable, create it!
    global.count++;
}

// @server/respond
function getClicks() {
    return global.count || 0;
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
        <a target="_blank"><img src="/assets/hizzy.png" className="logo" alt="Hizzy Logo" draggable={false}/></a>
        <h1>Hizzy</h1>
        <button onClick={onClick} onContextMenu={onClick}>count is {count}</button>
        <p>Edit <code>src/App.jsx</code> and save to test HMR</p>
        <p className="gray">Click on the Hizzy logo to learn more</p>
    </div>;
}

export default Main;