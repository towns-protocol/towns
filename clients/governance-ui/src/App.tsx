import { useState } from 'react'
import logo from './logo.svg'
import './App.css'

function App() {
    const [count, setCount] = useState(0)

    return (
        <div className="App">
            <header className="App-header">
                <p>Hello Human</p>
            </header>
        </div>
    )
}

export default App
