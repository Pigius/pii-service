import React, { useState, useEffect } from "react";
import axios from "axios";
import Highlighter from "react-highlight-words";
import styled from "styled-components";

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: Arial, sans-serif;
  background-color: #ffa500;
  height: 100vh;
  width: 100vw;
  overflow: auto;
  padding: 50px 0;
`;

const Header = styled.h1`
  color: #fff;
`;

const Note = styled.div`
  background: #fff;
  margin: 20px;
  padding: 20px;
  min-width: 300px;
  border-radius: 15px;
  box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.1);
  transform: rotate(
    ${() => Math.floor(0.3 * 5 - 3)}deg
  ); // A little rotation to make it feel like a sticky note
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  justify-content: center;
  width: 90%;
`;

const Form = styled.form`
  display: flex;
  width: 30%;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
`;

const Input = styled.textarea`
  width: 90%;
  min-height: 200px;
  margin-bottom: 10px;
  resize: vertical;
  font-size: 18px;
  padding: 10px;
`;

const Button = styled.button`
  width: 80%;
  padding: 15px;
  background-color: #006400;
  color: #fff;
  border-radius: 5px;
  border: none;
  cursor: pointer;
  font-family: "Verdana", sans-serif;
  font-size: 18px;
  &:hover {
    background-color: #009900;
  }
`;

const Label = styled.label`
  font-size: 20px;
  font-family: "Verdana", sans-serif;
  margin-bottom: 10px;
`;

const CharacterCount = styled.p`
  align-self: flex-end;
  margin-right: 10%;
  font-size: 20px;
  font-family: "Verdana", sans-serif;
`;

const App = () => {
  const [text, setText] = useState("");
  const [notes, setNotes] = useState([]);
  const [isLoading, setLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
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
        return new Date(b.body.creationDate) - new Date(a.body.creationDate);
      });
      setNotes(sortedNotes);
    } catch (error) {
      setError("Error fetching notes");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (text.length > 5000) {
      console.error(
        "The note is too long, please keep it under 5000 characters."
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await axios.post(process.env.REACT_APP_API_GATEWAY_DETECT, { text });
      setText("");
      // Refetch notes from API
      fetchNotes();
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

  const maxCharacters = 5000;
  const charactersRemaining = maxCharacters - text.length;

  return (
    <AppContainer>
      <Header>PII Detection App</Header>
      <p>
        This app uses Amazon Comprehend's PII detection to find and redact
        Personally Identifiable Information (PII) from the text you enter.
        Please only use fictional data, and do not paste real personal data into
        this application. Amazon Comprehend can detect the following PII &nbsp;
        <a
          target="_blank"
          rel="noreferrer"
          href="https://docs.aws.amazon.com/comprehend/latest/dg/how-pii.html"
        >
          entities
        </a>
      </p>
      <Form onSubmit={handleSubmit}>
        <Label htmlFor="note-input">Enter a note:</Label>
        <Input
          id="note-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={maxCharacters}
        />
        <CharacterCount>{`${charactersRemaining} characters remaining`}</CharacterCount>
        <Button type="submit">Submit</Button>
      </Form>
      {isLoading && <p>Loading...</p>}
      <GridContainer>
        {notes.map((note, index) => {
          const body = note.body;

          return (
            <Note key={index}>
              <h3>{body.originalContent}</h3>
              <p>Creation date: {note.creationDate}</p>
              <p>Detected PII entities:</p>
              <ul>
                {body.detectedPiiEntities.map((entity, entityIndex) => (
                  <li key={entityIndex}>{entity}</li>
                ))}
              </ul>
              <>
                <p>Redacted content:</p>
                <Highlighter
                  highlightClassName="YourHighlightClass"
                  searchWords={body.detectedPiiEntities || []}
                  autoEscape={true}
                  textToHighlight={
                    body.redactedContent || "Nothing to redact here"
                  }
                />
              </>
              <p>Message length: {body.messageLength}</p>
            </Note>
          );
        })}
      </GridContainer>
    </AppContainer>
  );
};

export default App;
