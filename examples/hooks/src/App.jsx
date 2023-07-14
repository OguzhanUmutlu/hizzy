import {useState} from "hizzy";

function Main() {
    const [count, setCount] = useState(0);

    return <div onClick={() => setCount(count + 1)}>
        Count: {count}
    </div>;
}

export default Main;