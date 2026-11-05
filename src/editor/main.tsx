import { render } from 'preact';
import { App } from './App';
import './editor.css';
import { init } from './store';

render(<App />, document.getElementById('editor') as HTMLElement);
void init();
