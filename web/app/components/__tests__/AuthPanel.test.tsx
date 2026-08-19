import { render, screen, fireEvent } from "@testing-library/react";
import AuthPanel from "../AuthPanel";

jest.mock("@/lib/api", () => ({
    login: jest.fn(),
    register: jest.fn(),
}));

describe("AuthPanel email validation", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("shows an error for an invalid email", async () => {
        render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");

        fireEvent.change(emailInput, {
            target: { value: "abcdf@email.c" },
        });
        fireEvent.blur(emailInput);

        expect(screen.getByText("Please enter a valid email.")).toBeInTheDocument();
    });

    test("shows an error for an empty email input", async () => {
        render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");

        fireEvent.change(emailInput, {
            target: { value: "" },
        });
        fireEvent.blur(emailInput);

        expect(screen.getByText("Email is required.")).toBeInTheDocument();
    });

    test("shows an error for an email input with spaces", async () => {
        render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");

        fireEvent.change(emailInput, {
            target: { value: "    " },
        });
        fireEvent.blur(emailInput);

        expect(screen.getByText("Email is required.")).toBeInTheDocument();
    });

    test("does not show an error for a valid email", async () => {
        render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");

        fireEvent.change(emailInput, {
            target: { value: "example@example.com" },
        });
        fireEvent.blur(emailInput);

        expect(screen.queryByText("Please enter a valid email.")).not.toBeInTheDocument();
    });
});