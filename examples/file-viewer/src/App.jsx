import {fetch} from "hizzy";

export default <div>
    <h1>File Viewer</h1>
    {await fetch("/myFile.txt")}
</div>;