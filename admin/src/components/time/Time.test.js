import { render, screen } from "@testing-library/react";
import Time from "./index";

// Mock current date to ensure consistent testing
const mockCurrentDate = new Date("2024-01-15T12:00:00Z"); // Monday, January 15, 2024

beforeEach(() => {
  // Mock Date.now() to return a fixed timestamp
  jest.spyOn(Date, "now").mockImplementation(() => mockCurrentDate.getTime());
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Time Component", () => {
  test('shows "Today" for current date in chat mode', () => {
    render(<Time date={mockCurrentDate.getTime()} withDate forChat />);
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  test("shows time for current date when not in chat mode", () => {
    render(
      <Time date={mockCurrentDate.getTime()} withDate={false} forChat={false} />
    );
    // Should show time in 24-hour format
    expect(screen.getByText(/^\d{2}:\d{2}$/)).toBeInTheDocument();
  });

  test('shows "Yesterday" for previous day', () => {
    const yesterday = new Date(mockCurrentDate);
    yesterday.setDate(yesterday.getDate() - 1);

    render(<Time date={yesterday.getTime()} withDate forChat />);
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
  });

  test("shows day name for dates within same week", () => {
    const lastWeek = new Date(mockCurrentDate);
    lastWeek.setDate(lastWeek.getDate() - 3); // 3 days ago

    render(<Time date={lastWeek.getTime()} withDate forChat />);
    expect(screen.getByText("Fri")).toBeInTheDocument(); // Should be Friday
  });

  test("shows month and day for same year dates", () => {
    const lastMonth = new Date(mockCurrentDate);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    render(<Time date={lastMonth.getTime()} withDate forChat />);
    expect(screen.getByText(/15 Dec/)).toBeInTheDocument(); // December 15
  });

  test("shows DD/MM/YY format for different year", () => {
    const lastYear = new Date(mockCurrentDate);
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    render(<Time date={lastYear.getTime()} withDate forChat />);
    expect(screen.getByText("15/01/23")).toBeInTheDocument(); // January 15, 2023
  });

  test("handles month boundary correctly", () => {
    const lastDayOfPreviousMonth = new Date(2024, 0, 31); // January 31, 2024
    const firstDayOfCurrentMonth = new Date(2024, 1, 1); // February 1, 2024

    // Mock current date to February 15, 2024
    jest
      .spyOn(Date, "now")
      .mockImplementation(() => new Date(2024, 1, 15).getTime());

    render(<Time date={firstDayOfCurrentMonth.getTime()} withDate forChat />);
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
  });

  test("handles year boundary correctly", () => {
    const lastDayOfYear = new Date(2023, 11, 31); // December 31, 2023
    const firstDayOfYear = new Date(2024, 0, 1); // January 1, 2024

    // Mock current date to January 15, 2024
    jest
      .spyOn(Date, "now")
      .mockImplementation(() => new Date(2024, 0, 15).getTime());

    render(<Time date={firstDayOfYear.getTime()} withDate forChat />);
    expect(screen.getByText("1 Jan")).toBeInTheDocument();
  });

  test("handles empty date gracefully", () => {
    render(<Time date={null} withDate forChat />);
    expect(screen.getByText("")).toBeInTheDocument();
  });

  test("handles invalid date gracefully", () => {
    render(<Time date="invalid-date" withDate forChat />);
    // Should not crash and should show empty or some fallback
    expect(screen.getByText("")).toBeInTheDocument();
  });
});
