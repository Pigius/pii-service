import React, { useState, useEffect } from "react";
import axios from "axios";
import Highlighter from "react-highlight-words";
import "./App.css";

const App = () => {
  const [text, setText] = useState("");
  const [notes, setNotes] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(process.env.REACT_APP_API_GATEWAY_NOTES);
      const parsedNotes = response.data.map((note) => {
        return { ...note, body: JSON.parse(note.body) };
      });
      const sortedNotes = parsedNotes.sort((a, b) => {
        return new Date(b.body.creation_date) - new Date(a.body.creation_date);
      });
      setNotes(sortedNotes);
    } catch (error) {
      setError("Error fetching notes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        process.env.REACT_APP_API_GATEWAY_DETECT,
        { text }
      );
      const newNote = {
        ...response.data,
        body: JSON.parse(response.data.body),
      };
      setNotes((prevNotes) => [newNote, ...prevNotes]);
      setText("");
    } catch (error) {
      setError("Error creating note");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  return (
    <div className="App">
      <header>
        <h1>PII Detection App</h1>
      </header>
      <form onSubmit={handleSubmit}>
        <label htmlFor="note-input">Enter a note:</label>
        <input
          id="note-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">Submit</button>
      </form>
      {isLoading && <p>Loading...</p>}
      {error && <p>{error}</p>}
      <div>
        {notes.map((note, index) => {
          const body = note.body;
          return (
            <div key={index}>
              <h3>Original Content:</h3>
              <p>{body.originalContent}</p>
              <h3>Size:</h3>
              <p>{body.messageLength}</p>
              <h3>Redacted Text:</h3>
              {body.redactedContent && body.redactedContent.length ? (
                <Highlighter
                  highlightClassName="YourHighlightClass"
                  searchWords={body.detectedPiiEntities || []}
                  autoEscape={true}
                  textToHighlight={body.redactedContent}
                />
              ) : (
                <p>No text was redacted</p>
              )}
              <h3>Detected PII Entities:</h3>
              {body.detectedPiiEntities && body.detectedPiiEntities.length ? (
                <ul>
                  {body.detectedPiiEntities.map((entity, index) => (
                    <li key={index}>{entity}</li>
                  ))}
                </ul>
              ) : (
                <p>No PII entities detected</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default App;
