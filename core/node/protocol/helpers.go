package protocol

func (e *StreamEvent) GetStreamSettings() *StreamSettings {
	if e == nil {
		return nil
	}
	i := e.GetInceptionPayload()
	if i == nil {
		return nil
	}
	return i.GetSettings()
}
