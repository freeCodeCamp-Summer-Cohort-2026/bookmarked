import { render, screen, fireEvent } from "@testing-library/react";
import AuthPanel from "../AuthPanel";

jest.mock("@/lib/api", () => ({
    login: jest.fn(),
    register: jest.fn(),
}));

import { login } from "@/lib/api";

describe("AuthPanel email validation", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("shows an error for an invalid email", () => {
        render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");

        fireEvent.change(emailInput, {
            target: { value: "abcdf@email.c" },
        });
        fireEvent.blur(emailInput);

        expect(screen.getByText("Please enter a valid email.")).toBeInTheDocument();
    });

    test("shows an error for an empty email input", () => {
        render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");

        fireEvent.change(emailInput, {
            target: { value: "" },
        });
        fireEvent.blur(emailInput);

        expect(screen.getByText("Email is required.")).toBeInTheDocument();
    });

    test("shows an error for an email input with spaces", () => {
        render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");

        fireEvent.change(emailInput, {
            target: { value: "    " },
        });
        fireEvent.blur(emailInput);

        expect(screen.getByText("Email is required.")).toBeInTheDocument();
    });

    test("api is not called for invalid email and error is shown", () => {
        const { container } = render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");
        const passwordInput = screen.getByPlaceholderText("Password");
        const formElement = container.querySelector("form");

        expect(formElement).not.toBeNull();

        fireEvent.change(emailInput, {
            target: { value: "    " },
        });
        fireEvent.blur(emailInput);
        expect(screen.getByText("Email is required.")).toBeInTheDocument();

        fireEvent.change(passwordInput, {
            target: { value: "password123" },
        });

        fireEvent.submit(formElement!);
        expect(screen.getByText("Email is required.")).toBeInTheDocument();
        expect(login).not.toHaveBeenCalled();
    });

    test("email is trimmed and error is not shown for a valid email", () => {
        render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");

        fireEvent.change(emailInput, {
            target: { value: "example@example.com  " },
        });
        fireEvent.blur(emailInput);

        expect(screen.queryByText("Please enter a valid email.")).not.toBeInTheDocument();
    });

    test("does not show an error for a valid email", () => {
        render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");

        fireEvent.change(emailInput, {
            target: { value: "example@example.com" },
        });
        fireEvent.blur(emailInput);

        expect(screen.queryByText("Please enter a valid email.")).not.toBeInTheDocument();
    });
});