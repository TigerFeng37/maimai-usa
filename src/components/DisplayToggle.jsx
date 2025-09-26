import React from "react";

function DisplayToggle() {

    const [dark, setDark] = React.useState(false);

    const darkModeHandler = () => {
        setDark(!dark);
        document.body.classList.toggle("dark");
    }

    return (
        <div className="bg-yellow-500 dark:bg-gray-900 p-2">
            <button onClick={()=> darkModeHandler()}>
                {
                    
                    dark && <span>☀️</span>
                }
                {
                    !dark && <span>🌙</span>
                }
            </button>
        </div>
    );
}

export default DisplayToggle;