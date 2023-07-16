import Lang from "hizzy-language";

export default <div>
    <Lang>hey</Lang><br/>
    <button onClick={() => Lang.language = Lang.next}>Change language</button>
</div>;